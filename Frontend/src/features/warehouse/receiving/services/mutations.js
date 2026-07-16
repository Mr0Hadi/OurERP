// src/features/warehouse/receiving/services/mutations.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  updateReceivingStatus,
  confirmReceiving,
} from "./api";
import { receivingKeys } from "./queryKeys";
import { purchaseKeys } from "#/features/purchases/services/queryKeys";

export const useUpdateReceivingStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ purchaseId, status }) =>
      updateReceivingStatus(purchaseId, status),
    onMutate: async ({ purchaseId, status }) => {
      await queryClient.cancelQueries({
        queryKey: receivingKeys.detail(Number(purchaseId)),
      });

      const previousDetail = queryClient.getQueryData(
        receivingKeys.detail(Number(purchaseId))
      );

      if (previousDetail) {
        queryClient.setQueryData(receivingKeys.detail(Number(purchaseId)), {
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
        receivingKeys.detail(Number(updatedPurchase.id)),
        updatedPurchase
      );
      // اینجا هم باید detail فیچر purchases رو invalidate کنیم
      queryClient.invalidateQueries({
        queryKey: purchaseKeys.detail(Number(updatedPurchase.id)),
      });
      queryClient.invalidateQueries({ queryKey: receivingKeys.lists() });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });
      toast.success("وضعیت دریافت به‌روزرسانی شد");
    },
    onError: (error, variables, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(
          receivingKeys.detail(Number(variables.purchaseId)),
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
  const navigate = useNavigate();

  return useMutation({
    mutationFn: ({ purchaseId, receivingData }) =>
      confirmReceiving(purchaseId, receivingData),
    onSuccess: (updatedPurchase) => {
      // فیچر receiving — کلید اصلی که لیست ازش استفاده می‌کنه
      queryClient.invalidateQueries({ queryKey: receivingKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: receivingKeys.detail(Number(updatedPurchase.id)),
      });

      // فیچر purchases — اگه جای دیگه‌ای هم همین رکورد رو نشون میده
      queryClient.invalidateQueries({
        queryKey: purchaseKeys.detail(Number(updatedPurchase.id)),
      });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });

      toast.success("دریافت کالا با موفقیت ثبت شد");
      navigate("/warehouse/receiving");
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در ثبت دریافت");
    },
  });
};
