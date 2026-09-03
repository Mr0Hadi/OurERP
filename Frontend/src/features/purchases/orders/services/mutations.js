import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  createPurchase,
  updatePurchase,
  updatePurchaseStatus,
  updatePurchasePayment,
  removePurchase,
} from "./api-v1";
import { purchaseKeys } from "./queryKeys";
import {
  incomingQueueKeys,
  receivingKeys,
} from "@/features/warehouse/receiving/services/queryKeys";
import { invalidatePurchaseEcosystem } from "./sharedInvalidation";
import { ROUTES } from "@/shared/constants/routes";
import { usePurchaseFormStore } from "../store/purchaseFormStore";

export const useCreatePurchaseMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPurchase,
    onSuccess: (created) => {
      toast.success("خرید با موفقیت ثبت شد");
      invalidatePurchaseEcosystem(queryClient, created?.id);
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در ثبت خرید");
    },
  });
};

export const useUpdatePurchaseMutation = (id) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (purchaseData) => updatePurchase(id, purchaseData),
    onSuccess: () => {
      // ویرایش خرید تعداد اقلام را عوض می‌کند، پس «چقدر قابل دریافت
      // است» و در نتیجه صف دریافت هم عوض می‌شود — نه فقط خودِ خرید.
      invalidatePurchaseEcosystem(queryClient, id);
      toast.success("خرید با موفقیت ویرایش شد");
      navigate(ROUTES.PURCHASES_LIST);
      usePurchaseFormStore.getState().resetForm();
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در ویرایش خرید");
    },
  });
};

export const useUpdatePurchaseStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }) => updatePurchaseStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: purchaseKeys.detail(id) });

      const previousPurchase = queryClient.getQueryData(
        purchaseKeys.detail(id)
      );

      if (previousPurchase) {
        queryClient.setQueryData(purchaseKeys.detail(id), {
          ...previousPurchase,
          status,
        });
      }

      return { previousPurchase };
    },
    onSuccess: (updatedPurchase) => {
      queryClient.setQueryData(
        purchaseKeys.detail(updatedPurchase.id),
        updatedPurchase
      );
      // تغییر وضعیت به «ارسال‌شده» همین خرید را وارد صف دریافت انبار
      // می‌کند و «لغو» از آن بیرون می‌برد؛ هیچ‌کدام تا امروز صف را
      // باطل نمی‌کرد.
      invalidatePurchaseEcosystem(queryClient, updatedPurchase.id);
      toast.success("وضعیت خرید به‌روزرسانی شد");
    },
    onError: (error, variables, context) => {
      if (context?.previousPurchase) {
        queryClient.setQueryData(
          purchaseKeys.detail(variables.id),
          context.previousPurchase
        );
      }
      toast.error(error?.message || "خطا در به‌روزرسانی وضعیت");
    },
  });
};

export const useRecordPaymentMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, paymentData }) => updatePurchasePayment(id, paymentData),
    onMutate: async ({ id, paymentData }) => {
      await queryClient.cancelQueries({ queryKey: purchaseKeys.detail(id) });

      const previousPurchase = queryClient.getQueryData(
        purchaseKeys.detail(id)
      );

      if (previousPurchase) {
        queryClient.setQueryData(purchaseKeys.detail(id), {
          ...previousPurchase,
          paidAmount: previousPurchase.paidAmount + paymentData.amount,
        });
      }

      return { previousPurchase };
    },
    onSuccess: (updatedPurchase) => {
      queryClient.setQueryData(
        purchaseKeys.detail(updatedPurchase.id),
        updatedPurchase
      );
      queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });
      queryClient.invalidateQueries({ queryKey: receivingKeys.lists() });
      // صفِ دریافت مبلغ خرید را در ستون «مبلغ» نشان می‌دهد.
      queryClient.invalidateQueries({ queryKey: incomingQueueKeys.all });
      toast.success("پرداخت با موفقیت ثبت شد");
    },
    onError: (error, variables, context) => {
      if (context?.previousPurchase) {
        queryClient.setQueryData(
          purchaseKeys.detail(variables.id),
          context.previousPurchase
        );
      }
      toast.error(error?.message || "خطا در ثبت پرداخت");
    },
  });
};

export const useRemovePurchaseMutation = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: removePurchase,
    onSuccess: (removedPurchase) => {
      queryClient.removeQueries({ queryKey: purchaseKeys.detail(removedPurchase.id) });
      // خریدِ حذف‌شده باید از صف دریافت و از فهرست «خریدهای قابل
      // مرجوع‌کردن» هم بیرون برود.
      invalidatePurchaseEcosystem(queryClient, removedPurchase.id);
      toast.success("خرید با موفقیت حذف شد");
      navigate(ROUTES.PURCHASES_LIST);
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در حذف خرید");
    },
  });
};