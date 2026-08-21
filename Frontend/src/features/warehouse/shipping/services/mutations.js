import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { confirmShipment } from "./api-mockData";
import { executeGoodsRound } from "@/features/sales/returns/services/api-mockData";
import { confirmSupplierReturnShipmentBatch } from "@/features/purchases/returns/services/api-mockData";
import { salesReturnKeys } from "@/features/sales/returns/services/queryKeys";
import { purchaseReturnKeys } from "@/features/purchases/returns/services/queryKeys";
import { invalidateSalesEcosystem } from "@/features/sales/orders/services/sharedInvalidation";
import { invalidatePurchaseEcosystem } from "@/features/purchases/orders/services/sharedInvalidation";
import { outgoingQueueKeys } from "./queryKeys";

export const useConfirmShipmentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ saleId, shipmentData }) => confirmShipment(saleId, shipmentData),
    onSuccess: (updatedSale) => {
      invalidateSalesEcosystem(queryClient, updatedSale.id);
      queryClient.invalidateQueries({ queryKey: outgoingQueueKeys.lists() });
      toast.success("ارسال کالا با موفقیت ثبت شد");
    },
    onError: (error) => toast.error(error?.message || "خطا در ثبت ارسال"),
  });
};

export const useConfirmReplacementShipmentBatchMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ returnId, shipmentData }) => executeGoodsRound(returnId, shipmentData),
    onSuccess: (updatedReturn) => {
      queryClient.setQueryData(salesReturnKeys.detail(updatedReturn.id), updatedReturn);
      invalidateSalesEcosystem(queryClient, updatedReturn.saleId);
      queryClient.invalidateQueries({ queryKey: outgoingQueueKeys.lists() });
      toast.success("ارسال کالای مرجوعی ثبت شد");
    },
    onError: (error) => toast.error(error?.message || "خطا در ثبت ارسال جایگزین"),
  });
};

export const useConfirmSupplierReturnShipmentBatchMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ returnId, shipmentData }) =>
      confirmSupplierReturnShipmentBatch(returnId, shipmentData),
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