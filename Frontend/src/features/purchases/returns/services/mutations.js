import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  createPurchaseReturn,
  addClaimResolution,
  removeClaimResolution,
  executeGoodsRound,
  rejectPurchaseReturn,
  cancelPurchaseReturn,
  reopenPurchaseReturn,
  removePurchaseReturn,
} from "./api";
import { purchaseReturnKeys } from "./queryKeys";
import { invalidatePurchaseEcosystem } from "../../orders/services/sharedInvalidation";
import { ROUTES } from "@/shared/constants/routes";
import { idempotencyKeyFor } from "@/shared/services/api/contract";

const finalizeReturnChange = (queryClient, updated) => {
  queryClient.setQueryData(purchaseReturnKeys.detail(updated.id), updated);
  invalidatePurchaseEcosystem(queryClient, updated.purchaseId);
};

export const useCreatePurchaseReturnMutation = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    // کلید ایدمپوتنسی برای هر «قصدِ کاربر» یکتا ساخته می‌شود: اگر
    // درخواست به‌خاطر شبکه دوباره فرستاده شود، سرور همان مرجوعی را
    // برمی‌گرداند نه یک مرجوعیِ تکراری.
    mutationFn: (payload) =>
      createPurchaseReturn(payload, { idempotencyKey: idempotencyKeyFor(payload) }),
    onSuccess: (created) => {
      toast.success("درخواست مرجوعی ثبت شد؛ حالا می‌توانید برایش تصمیم بگیرید");
      invalidatePurchaseEcosystem(queryClient, created.purchaseId);
      navigate(ROUTES.PURCHASES_RETURNS_DETAIL.replace(":id", created.id));
    },
    onError: (error) => toast.error(error?.message || "خطا در ثبت مرجوعی"),
  });
};

export const useAddClaimResolutionMutation = (returnId) => {
  const queryClient = useQueryClient();
  return useMutation({
    // ثبت تصمیم یک اثر مالیِ فوری دارد؛ بدون کلید ایدمپوتنسی، یک
    // دوبار-کلیک یعنی دو بار جابه‌جایی پول.
    mutationFn: (variables) =>
      addClaimResolution(
        returnId,
        variables.claimId,
        variables.composition,
        { idempotencyKey: idempotencyKeyFor(variables) },
      ),
    onSuccess: (updated) => {
      finalizeReturnChange(queryClient, updated);
      toast.success("تصمیم ثبت شد");
    },
    onError: (error) => toast.error(error?.message || "خطا در ثبت تصمیم"),
  });
};

export const useRemoveClaimResolutionMutation = (returnId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, resolutionId }) =>
      removeClaimResolution(returnId, claimId, resolutionId),
    onSuccess: (updated) => {
      finalizeReturnChange(queryClient, updated);
      toast.success("تصمیم حذف شد و اثر مالی‌اش برگشت خورد");
    },
    onError: (error) => toast.error(error?.message || "خطا در حذف تصمیم"),
  });
};

/**
 * ثبت یک دور جابه‌جایی فیزیکی کالا. هم صفحه‌ی «دریافت» انبار از آن
 * استفاده می‌کند و هم صفحه‌ی «ارسال» — چون در مدل جدید هر دو یک
 * عملیات‌اند با جهت مخالف.
 */
export const useExecuteGoodsRoundMutation = (returnId) => {
  const queryClient = useQueryClient();
  return useMutation({
    // دورِ کالا تجمعی است (`doneQty` جمع می‌شود)، پس تکرارِ یک
    // درخواست موجودی را دوبار جابه‌جا می‌کند.
    mutationFn: (payload) =>
      executeGoodsRound(returnId, payload, {
        idempotencyKey: idempotencyKeyFor(payload),
      }),
    onSuccess: (updated) => {
      finalizeReturnChange(queryClient, updated);
      toast.success("جابه‌جایی کالا ثبت شد");
    },
    onError: (error) => toast.error(error?.message || "خطا در ثبت جابه‌جایی کالا"),
  });
};

export const useRejectPurchaseReturnMutation = (returnId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => rejectPurchaseReturn(returnId),
    onSuccess: (updated) => {
      finalizeReturnChange(queryClient, updated);
      toast.success("درخواست به‌عنوان رد‌شده ثبت شد");
    },
    onError: (error) => toast.error(error?.message || "خطا در ثبت رد درخواست"),
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
      toast.success("مرجوعی دوباره برای بررسی باز شد");
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