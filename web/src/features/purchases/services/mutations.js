// src/features/purchases/services/mutations.js

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  createPurchase,
  updatePurchase,
  updatePurchaseStatus,
  updatePurchasePayment,
  removePurchase,
} from "./api";
import { purchaseKeys } from "./queryKeys";
import { ROUTES } from "@/shared/constants/routes";

export const useCreatePurchaseMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPurchase,
    onSuccess: () => {
      toast.success("خرید با موفقیت ثبت شد");
      queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });
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
      queryClient.invalidateQueries({
        queryKey: purchaseKeys.detail(String(id)),
      });
      queryClient.invalidateQueries({
        queryKey: purchaseKeys.lists(),
      });
      toast.success("خرید با موفقیت ویرایش شد");
      navigate(ROUTES.PURCHASES_LIST);
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
      queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });
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
      queryClient.removeQueries({ queryKey: purchaseKeys.detail(String(removedPurchase.id)) });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });
      toast.success("خرید با موفقیت حذف شد");
      navigate(ROUTES.PURCHASES_LIST);
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در حذف خرید");
    },
  });
};