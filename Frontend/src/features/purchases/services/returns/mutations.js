// src/features/purchases/services/returns/mutations.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  createPurchaseReturn,
  addItemResolution,
  removeItemResolution,
  rejectPurchaseReturn,
  cancelPurchaseReturn,
  reopenPurchaseReturn,
  removePurchaseReturn,
} from "./api-mockData";
import { purchaseReturnKeys } from "./queryKeys";
import { invalidatePurchaseEcosystem } from "../sharedInvalidation";
import { ROUTES } from "@/shared/constants/routes";
import { usePurchaseReturnFormStore } from "../../store/purchaseReturnFormStore";

const finalizeReturnChange = (queryClient, updated) => {
  queryClient.setQueryData(purchaseReturnKeys.detail(updated.id), updated);
  invalidatePurchaseEcosystem(queryClient, updated.purchaseId);
};

export const useCreatePurchaseReturnMutation = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: createPurchaseReturn,
    onSuccess: (created) => {
      toast.success("مرجوعی با موفقیت ثبت شد");
      invalidatePurchaseEcosystem(queryClient, created.purchaseId);
      usePurchaseReturnFormStore.getState().resetForm();
      navigate(`/purchases/returns/${created.id}`);
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در ثبت مرجوعی");
    },
  });
};

export const useAddReturnItemResolutionMutation = (returnId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ issueId, resolution }) =>
      addItemResolution(returnId, issueId, resolution),
    onSuccess: (updated) => {
      finalizeReturnChange(queryClient, updated);
      toast.success("تصمیم برای این قلم ثبت شد");
    },
    onError: (error) => toast.error(error?.message || "خطا در ثبت تصمیم"),
  });
};

export const useRemoveReturnItemResolutionMutation = (returnId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ issueId, resolutionId }) =>
      removeItemResolution(returnId, issueId, resolutionId),
    onSuccess: (updated) => {
      finalizeReturnChange(queryClient, updated);
      toast.success("تصمیم حذف شد");
    },
    onError: (error) => toast.error(error?.message || "خطا در حذف تصمیم"),
  });
};

export const useRejectPurchaseReturnMutation = (returnId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => rejectPurchaseReturn(returnId),
    onSuccess: (updated) => {
      finalizeReturnChange(queryClient, updated);
      toast.success("مرجوعی به‌عنوان رد‌شده ثبت شد");
    },
    onError: (error) => toast.error(error?.message || "خطا در ثبت رد مرجوعی"),
  });
};

export const useCancelPurchaseReturnMutation = (returnId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cancelPurchaseReturn(returnId),
    onSuccess: (updated) => {
      finalizeReturnChange(queryClient, updated);
      toast.success("مرجوعی لغو شد");
    },
    onError: (error) => toast.error(error?.message || "خطا در لغو مرجوعی"),
  });
};

export const useReopenPurchaseReturnMutation = (returnId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => reopenPurchaseReturn(returnId),
    onSuccess: (updated) => {
      finalizeReturnChange(queryClient, updated);
      toast.success("مرجوعی دوباره برای هماهنگی باز شد");
    },
    onError: (error) => toast.error(error?.message || "خطا در بازگشایی مرجوعی"),
  });
};

export const useRemovePurchaseReturnMutation = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: removePurchaseReturn,
    onSuccess: (removed) => {
      queryClient.removeQueries({ queryKey: purchaseReturnKeys.detail(removed.id) });
      invalidatePurchaseEcosystem(queryClient, removed.purchaseId);
      toast.success("مرجوعی حذف شد");
      navigate(ROUTES.PURCHASES_RETURNS_LIST);
    },
    onError: (error) => toast.error(error?.message || "خطا در حذف مرجوعی"),
  });
};