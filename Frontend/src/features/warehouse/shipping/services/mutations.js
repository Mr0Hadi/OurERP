// src/features/warehouse/shipping/services/mutations.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { confirmShipment } from "./api-mockData";
import { confirmReplacementShipmentBatch } from "@/features/sales/services/returns/api-mockData";
import { salesReturnKeys } from "@/features/sales/services/returns/queryKeys";
import { invalidateSalesEcosystem } from "@/features/sales/services/sharedInvalidation";
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
    mutationFn: ({ returnId, shipmentData }) => confirmReplacementShipmentBatch(returnId, shipmentData),
    onSuccess: (updatedReturn) => {
      queryClient.setQueryData(salesReturnKeys.detail(updatedReturn.id), updatedReturn);
      invalidateSalesEcosystem(queryClient, updatedReturn.saleId);
      queryClient.invalidateQueries({ queryKey: outgoingQueueKeys.lists() });
      toast.success("ارسال کالای جایگزین ثبت شد");
    },
    onError: (error) => toast.error(error?.message || "خطا در ثبت ارسال جایگزین"),
  });
};