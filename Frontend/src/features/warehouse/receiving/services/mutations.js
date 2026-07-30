// src/features/warehouse/receiving/services/mutations.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  updateReceivingStatus,
  confirmReceiving,
} from "./api-mockData";
import { receivingKeys } from "./queryKeys";
import { invalidatePurchaseEcosystem } from "#/features/purchases/services/sharedInvalidation";

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
      invalidatePurchaseEcosystem(queryClient, updatedPurchase.id);
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

export const useConfirmReceivingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ purchaseId, receivingData }) =>
      confirmReceiving(purchaseId, receivingData),
    onSuccess: (updatedPurchase) => {
      // چون این دور دریافت ممکن است هم‌زمان چند مرجوعیِ «در انتظار
      // ارسال جایگزین» را ببندد و هم وضعیت خودِ خرید را تغییر دهد،
      // از تابع مرکزیِ invalidation استفاده می‌کنیم تا هیچ کش
      // فراموش نشود.
      invalidatePurchaseEcosystem(queryClient, updatedPurchase.id);
      toast.success("دریافت کالا با موفقیت ثبت شد");
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در ثبت دریافت");
    },
  });
};