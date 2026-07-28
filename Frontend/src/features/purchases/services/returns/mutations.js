// src/features/purchases/services/returns/mutations.js
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  createPurchaseReturn,
  updatePurchaseReturn,
  updatePurchaseReturnStatus,
  removePurchaseReturn,
} from "./api-mockData";
import { purchaseReturnKeys } from "./queryKeys";
import { purchaseKeys } from "@/features/purchases/services/queryKeys";
import { ROUTES } from "@/shared/constants/routes";
import { usePurchaseReturnFormStore } from "../../store/purchaseReturnFormStore";

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
      // مستقیم به صفحه‌ی همین مرجوعی برو تا هماهنگی با تامین‌کننده
      // بلافاصله از همان‌جا قابل شروع باشد
      navigate(`/purchases/returns/${created.id}`);
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در ثبت مرجوعی");
    },
  });
};

export const useUpdatePurchaseReturnMutation = (id) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates) => updatePurchaseReturn(id, updates),
    onSuccess: (updated) => {
      queryClient.setQueryData(purchaseReturnKeys.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: purchaseReturnKeys.lists() });
      toast.success("مرجوعی به‌روزرسانی شد");
    },
    onError: (error) =>
      toast.error(error?.message || "خطا در به‌روزرسانی مرجوعی"),
  });
};

export const useUpdatePurchaseReturnStatusMutation = (id) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (statusData) => updatePurchaseReturnStatus(id, statusData),
    onMutate: async (statusData) => {
      await queryClient.cancelQueries({ queryKey: purchaseReturnKeys.detail(id) });
      const previous = queryClient.getQueryData(purchaseReturnKeys.detail(id));
      if (previous) {
        queryClient.setQueryData(purchaseReturnKeys.detail(id), {
          ...previous,
          ...statusData,
        });
      }
      return { previous };
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(purchaseReturnKeys.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: purchaseReturnKeys.lists() });
      // لغو یا رد شدن مرجوعی ممکن است دوباره کسری باز کند، پس گزارش‌ها هم رفرش شوند
      queryClient.invalidateQueries({ queryKey: purchaseReturnKeys.reports() });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.detail(updated.purchaseId) });
      queryClient.invalidateQueries({ queryKey: purchaseKeys.lists() });
      toast.success("وضعیت مرجوعی به‌روزرسانی شد");
    },
    onError: (error, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(purchaseReturnKeys.detail(id), context.previous);
      }
      toast.error(error?.message || "خطا در به‌روزرسانی وضعیت");
    },
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