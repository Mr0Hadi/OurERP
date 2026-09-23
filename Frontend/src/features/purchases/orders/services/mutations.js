import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  createPurchase,
  updatePurchase,
  updatePurchaseStatus,
  removePurchase,
  closePurchaseItem,
  reopenPurchaseItem,
  acceptPurchaseExcess,
} from "./api-v1";
import { purchaseKeys } from "./queryKeys";
import { invalidatePurchaseEcosystem } from "./sharedInvalidation";
import { idempotencyKeyFor } from "@/shared/services/api/contract";
import { ROUTES } from "@/shared/constants/routes";
import { usePurchaseFormStore } from "../store/purchaseFormStore";

export const useCreatePurchaseMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPurchase,
    // `CreatePurchase` شناسه‌ی سندِ تازه را برنمی‌گرداند؛ فقط لیست‌ها باطل می‌شوند.
    onSuccess: () => {
      toast.success("خرید با موفقیت ثبت شد");
      invalidatePurchaseEcosystem(queryClient);
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
    // `updatePurchaseStatus` سندِ تازه‌خوانده را برمی‌گرداند (`UpdatePurchase`
    // خودش `data` ندارد). شناسه از ورودی خوانده می‌شود، نه از پاسخ.
    onSuccess: (updatedPurchase, { id }) => {
      if (updatedPurchase) {
        queryClient.setQueryData(purchaseKeys.detail(id), updatedPurchase);
      }
      // تغییر وضعیت به «ارسال‌شده» همین خرید را وارد صف دریافت انبار
      // می‌کند و «لغو» از آن بیرون می‌برد.
      invalidatePurchaseEcosystem(queryClient, id);
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

export const useRemovePurchaseMutation = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: removePurchase,
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: purchaseKeys.detail(id) });
      // خریدِ حذف‌شده باید از صف دریافت و از فهرست «خریدهای قابل
      // مرجوع‌کردن» هم بیرون برود.
      invalidatePurchaseEcosystem(queryClient);
      toast.success("خرید با موفقیت حذف شد");
      navigate(ROUTES.PURCHASES_LIST);
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در حذف خرید");
    },
  });
};

/**
 * بستن و بازگشاییِ یک قلم هر دو وضعیتِ خرید و صفِ دریافت را عوض می‌کنند
 * (مقدارِ بدهکارِ قلم تغییر می‌کند)، پس کلِ اکوسیستمِ خرید باطل می‌شود.
 */
export const useClosePurchaseItemMutation = (purchaseId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: closePurchaseItem,
    onSuccess: () => {
      invalidatePurchaseEcosystem(queryClient, purchaseId);
      toast.success("قلم بسته شد؛ باقیمانده‌اش دیگر انتظار نمی‌رود");
    },
    onError: (error) => toast.error(error?.message || "خطا در بستن قلم"),
  });
};

export const useReopenPurchaseItemMutation = (purchaseId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reopenPurchaseItem,
    onSuccess: () => {
      invalidatePurchaseEcosystem(queryClient, purchaseId);
      toast.success("قلم دوباره باز شد");
    },
    onError: (error) => toast.error(error?.message || "خطا در بازگشایی قلم"),
  });
};

/**
 * خریدِ کالای مازاد/سفارش‌نداده‌ی در قرنطینه. موجودی و جمعِ خرید را
 * تکان می‌دهد. کلید ایدمپوتنسی مثل بقیه‌ی دستورهای تجمعی فرستاده
 * می‌شود، ولی بکند هنوز آن را نمی‌خواند — محافظِ واقعی در برابر
 * دوبار-کلیک، غیرفعال‌بودنِ دکمه تا پایانِ درخواست است.
 */
export const useAcceptPurchaseExcessMutation = (purchaseId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) =>
      acceptPurchaseExcess(
        { ...payload, purchaseId },
        { idempotencyKey: idempotencyKeyFor(payload) },
      ),
    onSuccess: () => {
      invalidatePurchaseEcosystem(queryClient, purchaseId);
      toast.success("کالای مازاد به خرید اضافه شد و وارد موجودی شد");
    },
    onError: (error) => toast.error(error?.message || "خطا در پذیرش کالای مازاد"),
  });
};
