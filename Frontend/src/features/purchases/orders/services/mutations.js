import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  createPurchase,
  updatePurchase,
  changePurchaseStatus,
  updatePurchaseAttachments,
  updatePurchasePaymentDate,
  addPurchasePayment,
  editPurchasePayment,
  voidPurchasePayment,
  removePurchase,
  closePurchaseItem,
  reopenPurchaseItem,
  acceptPurchaseExcess,
} from "./api-v1";
import { purchaseKeys } from "./queryKeys";
import { invalidatePurchaseEcosystem } from "./sharedInvalidation";
import { idempotencyKeyFor } from "@/shared/services/api/contract";
import { ROUTES } from "@/shared/constants/routes";
import { supplierKeys } from "@/features/suppliers/services/queryKeys";

/**
 * هر نوشتنِ خرید سندِ کامل را برمی‌گرداند: همان در کشِ جزئیات می‌نشیند
 * (بدون درخواستِ دوباره) و بقیه‌ی اکوسیستم باطل می‌شود. مانده‌ی حسابِ
 * تامین‌کننده هم با صدور، پرداخت و لغو تکان می‌خورد.
 */
function applyPurchase(queryClient, purchase) {
  if (purchase?.id != null) {
    queryClient.setQueryData(purchaseKeys.detail(purchase.id), purchase);
  }
  invalidatePurchaseEcosystem(queryClient, purchase?.id, {
    freshPurchase: true,
  });
  queryClient.invalidateQueries({ queryKey: supplierKeys.all });
}

export const useCreatePurchaseMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // پیش‌پرداختِ همراهِ ثبت در دفتر حساب می‌نشیند؛ retry نباید سندِ دوم بسازد.
    mutationFn: (payload) =>
      createPurchase(payload, { idempotencyKey: idempotencyKeyFor(payload) }),
    onSuccess: (created) => {
      toast.success("خرید با موفقیت ثبت شد");
      applyPurchase(queryClient, created);
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در ثبت خرید");
    },
  });
};

/** فقط پیش‌فاکتور. */
export const useUpdatePurchaseMutation = (id) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (purchaseData) => updatePurchase(id, purchaseData),
    onSuccess: (updated) => {
      // ویرایش خرید تعداد اقلام را عوض می‌کند، پس «چقدر قابل دریافت
      // است» و در نتیجه صف دریافت هم عوض می‌شود — نه فقط خودِ خرید.
      applyPurchase(queryClient, updated);
      toast.success("خرید با موفقیت ویرایش شد");
    },
    onError: (error) => {
      toast.error(error?.message || "خطا در ویرایش خرید");
    },
  });
};

export const useChangePurchaseStatusMutation = (id) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status) => changePurchaseStatus(id, status),
    onSuccess: (updated) => {
      // «ارسال‌شده» خرید را وارد صف دریافت انبار می‌کند و «لغو» بیرون می‌برد.
      applyPurchase(queryClient, updated);
      toast.success("وضعیت خرید به‌روزرسانی شد");
    },
    onError: (error) => toast.error(error?.message || "خطا در تغییر وضعیت"),
  });
};

export const useUpdatePurchaseAttachmentsMutation = (id) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (attachments) => updatePurchaseAttachments(id, attachments),
    onSuccess: (updated) => {
      applyPurchase(queryClient, updated);
      toast.success("پیوست‌ها ذخیره شد");
    },
    onError: (error) =>
      toast.error(error?.message || "خطا در ذخیره‌ی پیوست‌ها"),
  });
};

export const useUpdatePurchasePaymentDateMutation = (id) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentDate) => updatePurchasePaymentDate(id, paymentDate),
    onSuccess: (updated) => {
      applyPurchase(queryClient, updated);
      toast.success("مهلت پرداخت ذخیره شد");
    },
    onError: (error) =>
      toast.error(error?.message || "خطا در ذخیره‌ی مهلت پرداخت"),
  });
};

/**
 * ثبت و اصلاحِ پرداخت تجمعی‌اند (retry یعنی پرداختِ دوم، هم در سند و هم
 * در حسابِ تامین‌کننده)، پس کلیدِ ایدمپوتنسی می‌گیرند. ابطالِ دوباره را
 * خودِ سرور با ۴۰۰ رد می‌کند.
 */
export const usePurchasePaymentMutations = (purchaseId) => {
  const queryClient = useQueryClient();
  const onSuccess = (message) => (updated) => {
    applyPurchase(queryClient, updated);
    toast.success(message);
  };
  const onError = (fallback) => (error) =>
    toast.error(error?.message || fallback);

  const add = useMutation({
    mutationFn: (payment) => {
      const payload = { ...payment, purchaseId };
      return addPurchasePayment(payload, {
        idempotencyKey: idempotencyKeyFor(payment),
      });
    },
    onSuccess: onSuccess("پرداخت ثبت شد"),
    onError: onError("خطا در ثبت پرداخت"),
  });

  const edit = useMutation({
    mutationFn: (payment) =>
      editPurchasePayment(payment, {
        idempotencyKey: idempotencyKeyFor(payment),
      }),
    onSuccess: onSuccess("پرداخت اصلاح شد"),
    onError: onError("خطا در اصلاح پرداخت"),
  });

  const voidPayment = useMutation({
    mutationFn: voidPurchasePayment,
    onSuccess: onSuccess("پرداخت باطل شد"),
    onError: onError("خطا در ابطال پرداخت"),
  });

  return { add, edit, void: voidPayment };
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
      queryClient.invalidateQueries({ queryKey: supplierKeys.all });
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
 * هر دو `payableAmount` و حسابِ تامین‌کننده را هم تکان می‌دهند.
 */
export const useClosePurchaseItemMutation = (purchaseId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: closePurchaseItem,
    onSuccess: () => {
      invalidatePurchaseEcosystem(queryClient, purchaseId);
      queryClient.invalidateQueries({ queryKey: supplierKeys.all });
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
      queryClient.invalidateQueries({ queryKey: supplierKeys.all });
      toast.success("قلم دوباره باز شد");
    },
    onError: (error) => toast.error(error?.message || "خطا در بازگشایی قلم"),
  });
};

/**
 * خریدِ کالای مازاد/سفارش‌نداده‌ی در قرنطینه. موجودی و جمعِ خرید را
 * تکان می‌دهد و قلمِ ضمیمه می‌سازد، پس مثل بقیه‌ی دستورهای تجمعی کلیدِ
 * ایدمپوتنسی می‌گیرد.
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
      queryClient.invalidateQueries({ queryKey: supplierKeys.all });
      toast.success(
        "کالای مازاد به‌صورت قلمِ ضمیمه به خرید اضافه شد و وارد موجودی شد",
      );
    },
    onError: (error) => toast.error(error?.message || "خطا در پذیرش کالای مازاد"),
  });
};
