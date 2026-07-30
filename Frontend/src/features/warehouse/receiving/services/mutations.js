// src/features/warehouse/receiving/services/mutations.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  updateReceivingStatus,
  confirmReceiving,
} from "./api-mockData";
import { receivingKeys } from "./queryKeys";
import { purchaseKeys } from "#/features/purchases/services/queryKeys";
import { purchaseReturnKeys } from "#/features/purchases/services/returns/queryKeys";

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

// این هوک navigate انجام نمی‌دهد؛ انباردار همیشه پس از ثبت دریافت به
// همان لیست دریافت‌ها برمی‌گردد (چه دریافت کامل بوده چه با کسری) —
// ثبت مرجوعی به تامین‌کننده کاملاً بر عهده‌ی واحد خرید است.
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

      // اگر این دریافت باعث بسته‌شدن خودکار یک مرجوعی «در انتظار
      // ارسال جایگزین» شده باشد، لیست مرجوعی‌ها هم باید رفرش شود
      queryClient.invalidateQueries({ queryKey: purchaseReturnKeys.lists() });
      queryClient.invalidateQueries({ queryKey: purchaseReturnKeys.reports() });

      toast.success("دریافت کالا با موفقیت ثبت شد");
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در ثبت دریافت");
    },
  });
};