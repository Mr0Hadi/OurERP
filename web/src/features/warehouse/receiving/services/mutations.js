import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  updateReceivingStatus,
  confirmReceiving,
  PURCHASE_STATUSES,
} from "./api";

import { receivingKeys } from "./queryKeys";
import { useNavigate } from "react-router-dom";
import { purchaseKeys } from "@/features/purchases/services/queryKeys";

export const useUpdateReceivingStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, receivedItems }) =>
      updateReceivingStatus(id, receivedItems),
    onMutate: async ({ id, receivedItems }) => {
      await queryClient.cancelQueries({ queryKey: receivingKeys.detail(id) });
      await queryClient.cancelQueries({ queryKey: receivingKeys.lists() });

      const previousPurchase = queryClient.getQueryData(
        receivingKeys.detail(id),
      );
      const previousList = queryClient.getQueryData(receivingKeys.list({}));

      if (previousPurchase) {
        const allItemsReceived = receivedItems.every(
          (item) => item.receivedQty >= item.orderedQty,
        );
        const anyItemReceived = receivedItems.some(
          (item) => item.receivedQty > 0,
        );

        let newStatus;
        if (allItemsReceived) {
          newStatus = PURCHASE_STATUSES.RECEIVED;
        } else if (anyItemReceived) {
          newStatus = PURCHASE_STATUSES.PARTIALLY_RECEIVED;
        } else {
          newStatus = PURCHASE_STATUSES.SHIPPED;
        }

        queryClient.setQueryData(receivingKeys.detail(id), {
          ...previousPurchase,
          status: newStatus,
          items: previousPurchase.items.map((item) => {
            const receivedItem = receivedItems.find(
              (ri) => ri.productId === item.productId,
            );
            return receivedItem
              ? { ...item, receivedQty: receivedItem.receivedQty }
              : item;
          }),
        });
      }

      return { previousPurchase, previousList };
    },
    onSuccess: (updatedPurchase) => {
      queryClient.setQueryData(
        receivingKeys.detail(updatedPurchase.id),
        updatedPurchase,
      );
      queryClient.invalidateQueries({ queryKey: receivingKeys.lists() });
      toast.success("دریافت کالا با موفقیت ثبت شد");
    },
    onError: (error, variables, context) => {
      if (context?.previousPurchase) {
        queryClient.setQueryData(
          receivingKeys.detail(variables.id),
          context.previousPurchase,
        );
      }
      if (context?.previousList) {
        queryClient.setQueryData(receivingKeys.list({}), context.previousList);
      }
      toast.error(error?.message || "خطا در ثبت دریافت کالا");
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
      queryClient.invalidateQueries({
        queryKey: purchaseKeys.detail(updatedPurchase.id),
      });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });
      toast.success("دریافت کالا با موفقیت ثبت شد");
      navigate("/warehouse/receiving"); // مسیر بازگشت به لیست دریافت
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در ثبت دریافت");
    },
  });
};
