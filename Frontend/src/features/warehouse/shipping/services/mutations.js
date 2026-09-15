import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import { dispatchShipment } from "./api-v1";
import { shippingKeys } from "./queryKeys";
import { invalidateSalesEcosystem } from "@/features/sales/orders/services/sharedInvalidation";
import { invalidatePurchaseEcosystem } from "@/features/purchases/orders/services/sharedInvalidation";
import { salesReturnKeys } from "@/features/sales/returns/services/queryKeys";
import { purchaseReturnKeys } from "@/features/purchases/returns/services/queryKeys";
import { fromApiReturn as fromApiSalesReturn } from "@/features/sales/returns/services/apiMapping";
import { fromApiReturn as fromApiPurchaseReturn } from "@/features/purchases/returns/services/apiMapping";
import { idempotencyKeyFor } from "@/shared/services/api/contract";

/**
 * ثبتِ یک محموله‌ی خروجی (`DispatchShipment`): ارسالِ فروش و دورهای
 * خروجِ مرجوعی. سندهای مرجوعیِ برگشتی مستقیم در کش می‌نشینند؛ خودِ فروش
 * سند کامل برنمی‌گرداند و باطل می‌شود.
 */
export const useDispatchShipmentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // ارسال تجمعی است و تکرارِ درخواست موجودی را دوبار کم می‌کند.
    mutationFn: (command) =>
      dispatchShipment(command, { idempotencyKey: idempotencyKeyFor(command) }),
    onSuccess: (result, command) => {
      (result?.saleReturns || []).forEach((doc) => {
        const updated = fromApiSalesReturn(doc);
        queryClient.setQueryData(salesReturnKeys.detail(updated.id), updated);
        invalidateSalesEcosystem(queryClient, updated.saleId, {
          freshReturnId: updated.id,
        });
      });
      (result?.purchaseReturns || []).forEach((doc) => {
        const updated = fromApiPurchaseReturn(doc);
        queryClient.setQueryData(purchaseReturnKeys.detail(updated.id), updated);
        invalidatePurchaseEcosystem(queryClient, updated.purchaseId, {
          freshReturnId: updated.id,
        });
      });
      const saleId = result?.sale?.saleId ?? command.sale?.saleId;
      if (saleId != null) invalidateSalesEcosystem(queryClient, saleId);
      queryClient.invalidateQueries({ queryKey: shippingKeys.all });
      toast.success("ارسال کالا با موفقیت ثبت شد");
    },
    onError: (error) => toast.error(error?.message || "خطا در ثبت ارسال"),
  });
};
