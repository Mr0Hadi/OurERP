import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import { receiveShipment } from "./api-v1";
import { receivingKeys } from "./queryKeys";
import { invalidatePurchaseEcosystem } from "@/features/purchases/orders/services/sharedInvalidation";
import { invalidateSalesEcosystem } from "@/features/sales/orders/services/sharedInvalidation";
import { purchaseReturnKeys } from "@/features/purchases/returns/services/queryKeys";
import { salesReturnKeys } from "@/features/sales/returns/services/queryKeys";
import { fromApiReturn as fromApiPurchaseReturn } from "@/features/purchases/returns/services/apiMapping";
import { fromApiReturn as fromApiSalesReturn } from "@/features/sales/returns/services/apiMapping";
import { idempotencyKeyFor } from "@/shared/services/api/contract";

/**
 * ثبتِ یک محموله‌ی ورودی (`ReceiveShipment`): دریافتِ خرید و دورهای ورودِ
 * مرجوعی. سندهای مرجوعیِ برگشتی مستقیم در کش می‌نشینند؛ خودِ خرید سند
 * کامل برنمی‌گرداند و باطل می‌شود.
 */
export const useReceiveShipmentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // دریافت تجمعی است: بدون کلید ایدمپوتنسی، یک retry شبکه‌ای همان
    // محموله را دوبار وارد انبار می‌کند.
    mutationFn: (command) =>
      receiveShipment(command, { idempotencyKey: idempotencyKeyFor(command) }),
    onSuccess: (result, command) => {
      (result?.purchaseReturns || []).forEach((doc) => {
        const updated = fromApiPurchaseReturn(doc);
        queryClient.setQueryData(purchaseReturnKeys.detail(updated.id), updated);
        invalidatePurchaseEcosystem(queryClient, updated.purchaseId, {
          freshReturnId: updated.id,
        });
      });
      (result?.saleReturns || []).forEach((doc) => {
        const updated = fromApiSalesReturn(doc);
        queryClient.setQueryData(salesReturnKeys.detail(updated.id), updated);
        invalidateSalesEcosystem(queryClient, updated.saleId, {
          freshReturnId: updated.id,
        });
      });
      const purchaseId = result?.purchase?.purchaseId ?? command.purchase?.purchaseId;
      if (purchaseId != null) invalidatePurchaseEcosystem(queryClient, purchaseId);
      queryClient.invalidateQueries({ queryKey: receivingKeys.all });
      toast.success("دریافت کالا با موفقیت ثبت شد");
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در ثبت دریافت");
    },
  });
};
