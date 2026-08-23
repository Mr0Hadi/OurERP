import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import { confirmShipment, confirmSupplierReturnShipment } from "./api";
import { outgoingQueueKeys } from "./queryKeys";
import { purchaseReturnKeys } from "@/features/purchases/returns/services/queryKeys";
import { invalidateSalesEcosystem } from "@/features/sales/orders/services/sharedInvalidation";
import { invalidatePurchaseEcosystem } from "@/features/purchases/orders/services/sharedInvalidation";
import { idempotencyKeyFor } from "@/shared/services/api/contract";

export const useConfirmShipmentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // قرینه‌ی سمت دریافت: ارسال هم تجمعی است و تکرارِ درخواست موجودی
    // را دوبار کم می‌کند.
    mutationFn: (variables) =>
      confirmShipment(variables.saleId, variables.shipmentData, {
        idempotencyKey: idempotencyKeyFor(variables),
      }),
    onSuccess: (updatedSale) => {
      // این حواله ممکن است هم‌زمان کالای جایگزینِ چند مرجوعی را هم
      // برده باشد، پس از تابع مرکزی استفاده می‌کنیم.
      invalidateSalesEcosystem(queryClient, updatedSale.id);
      queryClient.invalidateQueries({ queryKey: outgoingQueueKeys.lists() });
      toast.success("ارسال کالا با موفقیت ثبت شد");
    },
    onError: (error) => toast.error(error?.message || "خطا در ثبت ارسال"),
  });
};

export const useConfirmSupplierReturnShipmentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables) =>
      confirmSupplierReturnShipment(variables.returnId, variables.shipmentData, {
        idempotencyKey: idempotencyKeyFor(variables),
      }),
    onSuccess: (updatedReturn) => {
      queryClient.setQueryData(
        purchaseReturnKeys.detail(updatedReturn.id),
        updatedReturn,
      );
      invalidatePurchaseEcosystem(queryClient, updatedReturn.purchaseId);
      queryClient.invalidateQueries({ queryKey: outgoingQueueKeys.lists() });
      toast.success("عودت کالا به تامین‌کننده ثبت شد");
    },
    onError: (error) => toast.error(error?.message || "خطا در ثبت عودت"),
  });
};
