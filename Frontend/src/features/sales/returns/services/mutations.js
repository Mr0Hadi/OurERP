import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  createSalesReturn,
  addClaimResolution,
  removeClaimResolution,
  executeGoodsRound,
  rejectSalesReturn,
  cancelSalesReturn,
  reopenSalesReturn,
  removeSalesReturn,
} from "./api";
import { salesReturnKeys } from "./queryKeys";
import { invalidateSalesEcosystem } from "../../orders/services/sharedInvalidation";
import { ROUTES } from "@/shared/constants/routes";
import { idempotencyKeyFor } from "@/shared/services/api/contract";

const finalizeReturnChange = (queryClient, updated) => {
  // پاسخِ هر عملیاتِ نوشتن، سندِ کاملِ به‌روزشده است؛ پس مستقیم می‌نشیند
  // و با freshReturnId از باطل‌شدنِ دوباره‌اش جلوگیری می‌شود.
  queryClient.setQueryData(salesReturnKeys.detail(updated.id), updated);
  invalidateSalesEcosystem(queryClient, updated.saleId, {
    freshReturnId: updated.id,
  });
};

export const useCreateSalesReturnMutation = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    // کلید ایدمپوتنسی برای هر «قصدِ کاربر» یکتا ساخته می‌شود: اگر
    // درخواست به‌خاطر شبکه دوباره فرستاده شود، سرور همان مرجوعی را
    // برمی‌گرداند نه یک مرجوعیِ تکراری.
    mutationFn: (payload) =>
      createSalesReturn(payload, { idempotencyKey: idempotencyKeyFor(payload) }),
    onSuccess: (created) => {
      toast.success("درخواست مرجوعی ثبت شد؛ حالا می‌توانید برایش تصمیم بگیرید");
      invalidateSalesEcosystem(queryClient, created.saleId);
      navigate(ROUTES.SALES_RETURNS_DETAIL.replace(":id", created.id));
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

export const useRejectSalesReturnMutation = (returnId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => rejectSalesReturn(returnId),
    onSuccess: (updated) => {
      finalizeReturnChange(queryClient, updated);
      toast.success("درخواست به‌عنوان رد‌شده ثبت شد");
    },
    onError: (error) => toast.error(error?.message || "خطا در ثبت رد درخواست"),
  });
};

export const useCancelSalesReturnMutation = (returnId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cancelSalesReturn(returnId),
    onSuccess: (updated) => {
      finalizeReturnChange(queryClient, updated);
      toast.success("مرجوعی لغو شد");
    },
    onError: (error) => toast.error(error?.message || "خطا در لغو مرجوعی"),
  });
};

export const useReopenSalesReturnMutation = (returnId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => reopenSalesReturn(returnId),
    onSuccess: (updated) => {
      finalizeReturnChange(queryClient, updated);
      toast.success("مرجوعی دوباره برای بررسی باز شد");
    },
    onError: (error) => toast.error(error?.message || "خطا در بازگشایی مرجوعی"),
  });
};

export const useRemoveSalesReturnMutation = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: removeSalesReturn,
    onSuccess: (removed) => {
      queryClient.removeQueries({ queryKey: salesReturnKeys.detail(removed.id) });
      invalidateSalesEcosystem(queryClient, removed.saleId);
      toast.success("مرجوعی حذف شد");
      navigate(ROUTES.SALES_RETURNS_LIST);
    },
    onError: (error) => toast.error(error?.message || "خطا در حذف مرجوعی"),
  });
};