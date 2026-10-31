import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import { getErrorMessage } from "@/shared/lib/errorMessage";
import { idempotencyKeyFor } from "@/shared/services/api/contract";
import { bankAccountKeys } from "@/shared/services/bankAccounts/queryKeys";
import { customerKeys } from "@/features/customers/services/queryKeys";
import { supplierKeys } from "@/features/suppliers/services/queryKeys";
import { saleKeys } from "@/features/sales/orders/services/queryKeys";
import { purchaseKeys } from "@/features/purchases/orders/services/queryKeys";
import { accountingKeys } from "@/features/accounting/services/queryKeys";
import {
  addPartyPayment,
  allocatePartyPayment,
  removePartyPaymentAllocation,
  voidPartyPayment,
} from "./api-v1";
import { partyPaymentKeys } from "./queryKeys";

/**
 * بعد از هر نوشتن: سندِ برگشتی در کشِ جزئیات می‌نشیند و هرچه از این پول خوانده می‌شود باطل می‌شود — فهرستِ
 * علی‌الحساب‌ها و فاکتورهای قابلِ تخصیص، مانده و گردشِ شخص (زیرِ `customers`/`suppliers`)، صندوق/بانک، دفترِ
 * دریافت و پرداخت، و فروش/خرید (`paidAmount` و `paymentAllocations`؛ تخصیص به پیش‌فاکتورِ فروش صادرش می‌کند).
 *
 * عمداً `invalidateSalesEcosystem` نیست: موجودی، صفِ ارسال و مرجوعی‌ها تکان نمی‌خورند.
 */
function usePartyPaymentMutation({ mutationFn, success, failure }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (payment) => {
      if (payment?.id != null) queryClient.setQueryData(partyPaymentKeys.detail(payment.id), payment);
      queryClient.invalidateQueries({ queryKey: partyPaymentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [...partyPaymentKeys.all, "allocatable"] });
      queryClient.invalidateQueries({ queryKey: payment?.supplierId ? supplierKeys.all : customerKeys.all });
      queryClient.invalidateQueries({ queryKey: payment?.supplierId ? purchaseKeys.all : saleKeys.all });
      queryClient.invalidateQueries({ queryKey: bankAccountKeys.all });
      queryClient.invalidateQueries({ queryKey: accountingKeys.all });
      toast.success(success);
    },
    onError: (error) => toast.error(getErrorMessage(error, failure)),
  });
}

export const useAddPartyPaymentMutation = () =>
  usePartyPaymentMutation({
    // تکرارِ درخواست بی کلید یعنی دو دریافت.
    mutationFn: (body) => addPartyPayment(body, { idempotencyKey: idempotencyKeyFor(body, "party-payment") }),
    success: "دریافت/پرداختِ علی‌الحساب ثبت شد",
    failure: "ثبتِ دریافت/پرداخت انجام نشد",
  });

/** `{ paymentDetailId, allocations: [{ saleId|purchaseId, amount }] }` */
export const useAllocatePartyPaymentMutation = () =>
  usePartyPaymentMutation({
    mutationFn: (body) =>
      allocatePartyPayment(body, { idempotencyKey: idempotencyKeyFor(body, "party-allocate") }),
    success: "تخصیص ثبت شد",
    failure: "تخصیص انجام نشد",
  });

export const useRemoveAllocationMutation = () =>
  usePartyPaymentMutation({
    mutationFn: removePartyPaymentAllocation,
    success: "تخصیص برداشته شد",
    failure: "برداشتنِ تخصیص انجام نشد",
  });

export const useVoidPartyPaymentMutation = () =>
  usePartyPaymentMutation({
    mutationFn: voidPartyPayment,
    success: "دریافت/پرداخت ابطال شد",
    failure: "ابطال انجام نشد",
  });
