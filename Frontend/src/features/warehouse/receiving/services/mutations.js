import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  updateReceivingStatus,
  confirmReceiving,
} from "./api-mockData";
import { confirmReturnInspection } from "./returnsIntakeApi";
import { receivingKeys, incomingQueueKeys } from "./queryKeys";
import { invalidatePurchaseEcosystem } from "@/features/purchases/orders/services/sharedInvalidation";
import { invalidateSalesEcosystem } from "@/features/sales/orders/services/sharedInvalidation";
import { salesReturnKeys } from "@/features/sales/returns/services/queryKeys";

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
      queryClient.invalidateQueries({ queryKey: incomingQueueKeys.lists() });
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
      // فراموش نشود؛ صف یکپارچه‌ی دریافت انبار هم چون این خرید دیگر
      // در آن دیده نمی‌شود، باید invalidate شود.
      invalidatePurchaseEcosystem(queryClient, updatedPurchase.id);
      queryClient.invalidateQueries({ queryKey: incomingQueueKeys.lists() });
      toast.success("دریافت کالا با موفقیت ثبت شد");
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در ثبت دریافت");
    },
  });
};

export const useConfirmReturnInspectionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ returnId, inspectionData }) =>
      confirmReturnInspection(returnId, inspectionData),
    onSuccess: (updatedReturn) => {
      queryClient.setQueryData(salesReturnKeys.detail(updatedReturn.id), updatedReturn);
      invalidateSalesEcosystem(queryClient, updatedReturn.saleId);
      queryClient.invalidateQueries({ queryKey: incomingQueueKeys.lists() });
      toast.success("نتیجه‌ی بررسی و دریافت مرجوعی با موفقیت ثبت شد");
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در ثبت بررسی مرجوعی");
    },
  });
};
