import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import { getErrorMessage } from "@/shared/lib/errorMessage";
import { idempotencyKeyFor } from "@/shared/services/api/contract";
import { bankAccountKeys } from "@/shared/services/bankAccounts/queryKeys";
import { customerKeys } from "@/features/customers/services/queryKeys";
import { supplierKeys } from "@/features/suppliers/services/queryKeys";
import { saleKeys } from "@/features/sales/orders/services/queryKeys";
import { purchaseKeys } from "@/features/purchases/orders/services/queryKeys";
import { installmentKeys } from "@/features/sales/installments/services/queryKeys";
import { accountingKeys } from "@/features/accounting/services/queryKeys";
import { partyPaymentKeys } from "../../partyPayments/services/queryKeys";
import { bounceCheque, cashCheque, endorseCheque } from "./api-v1";
import { chequeKeys } from "./queryKeys";

/**
 * سرنوشتِ یک چک تقریباً همه‌چیزِ پولی را تکان می‌دهد: وصول مانده‌ی صندوق/بانک را، برگشت پرداختِ فاکتور یا قسط یا
 * علی‌الحساب و حسابِ شخص را، خرج پرداختِ خرید و حسابِ تامین‌کننده را. همه‌ی کش‌های پولی باطل می‌شوند؛ موجودی و
 * صف‌های انبار نه.
 */
const MONEY_KEYS = [
  chequeKeys.all,
  bankAccountKeys.all,
  customerKeys.all,
  supplierKeys.all,
  saleKeys.all,
  purchaseKeys.all,
  installmentKeys.all,
  partyPaymentKeys.all,
  accountingKeys.all,
];

function useChequeMutation({ mutationFn, scope, success, failure }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => mutationFn(body, { idempotencyKey: idempotencyKeyFor(body, scope) }),
    onSuccess: () => {
      MONEY_KEYS.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
      toast.success(success);
    },
    onError: (error) => toast.error(getErrorMessage(error, failure)),
  });
}

/** `{ paymentDetailId, bankAccountId, cashedAt }` */
export const useCashChequeMutation = () =>
  useChequeMutation({ mutationFn: cashCheque, scope: "cheque-cash", success: "وصولِ چک ثبت شد", failure: "ثبتِ وصول انجام نشد" });

/** `{ paymentDetailId, bouncedAt, note }` */
export const useBounceChequeMutation = () =>
  useChequeMutation({ mutationFn: bounceCheque, scope: "cheque-bounce", success: "برگشتِ چک ثبت شد", failure: "ثبتِ برگشت انجام نشد" });

/** `{ paymentDetailId, supplierId, purchaseId, endorsedAt, description }` */
export const useEndorseChequeMutation = () =>
  useChequeMutation({ mutationFn: endorseCheque, scope: "cheque-endorse", success: "چک خرج شد", failure: "خرج کردنِ چک انجام نشد" });
