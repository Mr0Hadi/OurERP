// src/features/warehouse/receiving/services/mutations.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  updateReceivingStatus,
  confirmReceiving,
} from "./api-mockData";
import { receivingKeys } from "./queryKeys";
import { purchaseKeys } from "#/features/purchases/services/queryKeys";

export const useUpdateReceivingStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ purchaseId, receivedItems }) =>
      updateReceivingStatus(purchaseId, receivedItems),
    onMutate: async ({ purchaseId, status }) => {
      await queryClient.cancelQueries({
        queryKey: receivingKeys.detail(purchaseId),
      });

      const previousDetail = queryClient.getQueryData(
        receivingKeys.detail(purchaseId)
      );

      if (previousDetail) {
        queryClient.setQueryData(receivingKeys.detail(purchaseId), {
          ...previousDetail,
          status,
        });
      }

      const previousLists = queryClient.getQueriesData({
        queryKey: receivingKeys.lists(),
      });

      previousLists.forEach(([queryKey, oldData]) => {
        if (oldData?.items) {
          queryClient.setQueryData(queryKey, {
            ...oldData,
            items: oldData.items.map((item) =>
              item.id === purchaseId ? { ...item, status } : item
            ),
          });
        }
      });

      return { previousDetail, previousLists };
    },
    onSuccess: (updatedPurchase) => {
      queryClient.setQueryData(
        receivingKeys.detail(updatedPurchase.id),
        updatedPurchase
      );
      queryClient.invalidateQueries({
        queryKey: purchaseKeys.detail(updatedPurchase.id),
      });
      queryClient.invalidateQueries({ queryKey: receivingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });
      toast.success("وضعیت دریافت به‌روزرسانی شد");
    },
    onError: (error, variables, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(
          receivingKeys.detail(variables.purchaseId),
          context.previousDetail
        );
      }
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, oldData]) => {
          queryClient.setQueryData(queryKey, oldData);
        });
      }
      toast.error(error?.message || "خطا در به‌روزرسانی وضعیت");
    },
  });
};

// توجه: این هوک دیگر navigate انجام نمی‌دهد. چون تصمیم مقصد ناوبری
// (بازگشت مستقیم به لیست دریافت‌ها یا پیشنهاد ثبت مرجوعی) به وجود
// یا عدم وجود کسری در همین دریافت بستگی دارد، این تصمیم داخل خودِ
// صفحه‌ی ReceivingDetailPage گرفته می‌شود، نه در این هوک عمومی.
export const useConfirmReceivingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ purchaseId, receivingData }) =>
      confirmReceiving(purchaseId, receivingData),
    onSuccess: (updatedPurchase) => {
      queryClient.invalidateQueries({ queryKey: receivingKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: receivingKeys.detail(updatedPurchase.id),
      });

      queryClient.invalidateQueries({
        queryKey: purchaseKeys.detail(updatedPurchase.id),
      });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });

      toast.success("دریافت کالا با موفقیت ثبت شد");
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در ثبت دریافت");
    },
  });
};