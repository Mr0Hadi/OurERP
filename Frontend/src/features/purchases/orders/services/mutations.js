import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { PurchaseStatusEnum, isPurchaseProforma } from "@/shared/domain/enums/purchaseStatus";
import { supplierKeys } from "@/features/suppliers/services/queryKeys";
import { getErrorMessage } from "@/shared/lib/errorMessage";
import { partialSaveMessage, runDocumentChanges } from "@/shared/services/documentChanges";

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
      const number = created?.invoiceNumber;
      toast.success(
        isPurchaseProforma(created?.status)
          ? "پیش‌فاکتور خرید ثبت شد"
          : number
            ? `فاکتور خرید ${number} ثبت شد`
            : "فاکتور خرید ثبت شد",
      );
      applyPurchase(queryClient, created);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "ثبت خرید انجام نشد"));
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
      toast.success(
        updated?.status === PurchaseStatusEnum.CANCELLED ? "خرید لغو شد" : "وضعیت خرید به‌روزرسانی شد",
      );
    },
    onError: (error) => toast.error(getErrorMessage(error, "تغییر وضعیت خرید انجام نشد")),
  });
};

/** فقط پیش‌فاکتور؛ رفتن به فهرست با خودِ صفحه است. */
export const useRemovePurchaseMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removePurchase,
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: purchaseKeys.detail(id) });
      // خریدِ حذف‌شده باید از صف دریافت و از فهرست «خریدهای قابل
      // مرجوع‌کردن» هم بیرون برود.
      invalidatePurchaseEcosystem(queryClient);
      queryClient.invalidateQueries({ queryKey: supplierKeys.all });
      toast.success("پیش‌فاکتور خرید حذف شد");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "حذف پیش‌فاکتور خرید انجام نشد"));
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
    onError: (error) => toast.error(getErrorMessage(error, "بستن قلم انجام نشد")),
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
    onError: (error) => toast.error(getErrorMessage(error, "بازگشایی قلم انجام نشد")),
  });
};

/**
 * خریدِ کالای مازاد/سفارش‌نداده‌ی در قرنطینه. جمعِ خرید را تکان می‌دهد و
 * قلمِ ضمیمه می‌سازد (کالا در قرنطینه می‌ماند)، پس مثل بقیه‌ی دستورهای
 * تجمعی کلیدِ ایدمپوتنسی می‌گیرد.
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
        "کالای مازاد به‌صورت قلمِ ضمیمه به خرید اضافه شد؛ کالا تا «بازگشت به موجودی» در قرنطینه می‌ماند",
      );
    },
    onError: (error) => toast.error(getErrorMessage(error, "خرید کالای مازاد انجام نشد")),
  });
};

const PURCHASE_CHANGES_API = {
  idField: "purchaseId",
  update: updatePurchase,
  addPayment: addPurchasePayment,
  editPayment: editPurchasePayment,
  voidPayment: voidPurchasePayment,
  paymentDate: updatePurchasePaymentDate,
  attachments: updatePurchaseAttachments,
  status: changePurchaseStatus,
};

/**
 * «ثبت تغییرات»ِ صفحه‌ی خرید (پیش‌فاکتور یا صادرشده): سند، پرداخت‌ها، سررسید،
 * پیوست‌ها و وضعیت با یک دکمه و یک پیام (`runDocumentChanges`). اگر وسطِ کار
 * خطا رخ دهد، آنچه انجام شده در کش می‌نشیند و بقیه در صفحه می‌ماند.
 */
export const usePurchaseChangesSaver = (purchaseId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes) => runDocumentChanges(PURCHASE_CHANGES_API, purchaseId, changes),
    onSuccess: (latest) => {
      if (latest) applyPurchase(queryClient, latest);
      toast.success("تغییرات خرید ذخیره شد");
    },
    onError: (error) => {
      invalidatePurchaseEcosystem(queryClient, purchaseId);
      toast.error(partialSaveMessage(error, getErrorMessage(error, "ذخیره‌ی تغییرات انجام نشد")));
    },
  });
};
