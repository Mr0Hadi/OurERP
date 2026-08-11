import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  createSalesReturn,
  addItemResolution,
  removeItemResolution,
  rejectSalesReturn,
  cancelSalesReturn,
  reopenSalesReturn,
  removeSalesReturn,
} from "./api-mockData";
import { salesReturnKeys } from "./queryKeys";
import { invalidateSalesEcosystem } from "../../orders/services/sharedInvalidation";
import { ROUTES } from "@/shared/constants/routes";

const finalizeReturnChange = (queryClient, updated) => {
  queryClient.setQueryData(salesReturnKeys.detail(updated.id), updated);
  invalidateSalesEcosystem(queryClient, updated.saleId);
};

export const useCreateSalesReturnMutation = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: createSalesReturn,
    onSuccess: (created) => {
      toast.success("درخواست مرجوعی ثبت شد و در انتظار بررسی انبار است");
      invalidateSalesEcosystem(queryClient, created.saleId);
      navigate(ROUTES.SALES_RETURNS_DETAIL.replace(":id", created.id));
    },
    onError: (error) => toast.error(error?.message || "خطا در ثبت مرجوعی"),
  });
};

export const useAddReturnItemResolutionMutation = (returnId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lineId, resolution }) => addItemResolution(returnId, lineId, resolution),
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
    mutationFn: ({ lineId, resolutionId }) => removeItemResolution(returnId, lineId, resolutionId),
    onSuccess: (updated) => {
      finalizeReturnChange(queryClient, updated);
      toast.success("تصمیم حذف شد");
    },
    onError: (error) => toast.error(error?.message || "خطا در حذف تصمیم"),
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