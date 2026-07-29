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
import { purchaseKeys } from "@/features/purchases/services/queryKeys";
import { receivingKeys } from "@/features/warehouse/receiving/services/queryKeys";
import { ROUTES } from "@/shared/constants/routes";
import { usePurchaseReturnFormStore } from "../../store/purchaseReturnFormStore";

const invalidateAfterReturnChange = (queryClient, updated) => {
  queryClient.setQueryData(purchaseReturnKeys.detail(updated.id), updated);
  queryClient.invalidateQueries({ queryKey: purchaseReturnKeys.lists() });
  queryClient.invalidateQueries({ queryKey: purchaseReturnKeys.reports() });
  queryClient.invalidateQueries({ queryKey: purchaseKeys.detail(updated.purchaseId) });
  queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });
  // یک خط «جایگزینی» تازه ثبت‌شده ممکن است خرید را دوباره به لیست
  // دریافتِ انباردار برگردانده باشد
  queryClient.invalidateQueries({ queryKey: receivingKeys.lists() });
};

export const useCreatePurchaseReturnMutation = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: createPurchaseReturn,
    onSuccess: (created) => {
      toast.success("مرجوعی با موفقیت ثبت شد");
      queryClient.invalidateQueries({ queryKey: purchaseReturnKeys.lists() });
      queryClient.invalidateQueries({ queryKey: purchaseReturnKeys.reports() });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });
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
      invalidateAfterReturnChange(queryClient, updated);
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
      invalidateAfterReturnChange(queryClient, updated);
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
      invalidateAfterReturnChange(queryClient, updated);
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
      invalidateAfterReturnChange(queryClient, updated);
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
      invalidateAfterReturnChange(queryClient, updated);
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
      queryClient.invalidateQueries({ queryKey: purchaseReturnKeys.lists() });
      queryClient.invalidateQueries({ queryKey: purchaseReturnKeys.reports() });
      toast.success("مرجوعی حذف شد");
      navigate(ROUTES.PURCHASES_RETURNS_LIST);
    },
    onError: (error) => toast.error(error?.message || "خطا در حذف مرجوعی"),
  });
};