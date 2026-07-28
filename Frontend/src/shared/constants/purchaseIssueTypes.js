// src/shared/constants/purchaseIssueTypes.js

/**
 * نوع مشکل، هم توسط انباردار هنگام ثبت دریافت انتخاب می‌شود
 * و هم به‌عنوان دلیل پیش‌فرض هر قلم در فرم ثبت مرجوعی به کار می‌رود.
 * قرار گرفتن این enum در یک مکان مشترک، از عدم‌هماهنگی بین
 * «چیزی که انبار گزارش می‌دهد» و «چیزی که خرید ثبت می‌کند» جلوگیری می‌کند.
 */
export const PURCHASE_ISSUE_TYPES = {
  SHORTAGE: "shortage",
  DEFECTIVE: "defective",
  DAMAGED: "damaged",
  WRONG_ITEM: "wrong_item",
  EXPIRED: "expired",
  OTHER: "other",
};

export const PURCHASE_ISSUE_TYPE_LABELS = {
  [PURCHASE_ISSUE_TYPES.SHORTAGE]: "کسری تحویل (نرسیده)",
  [PURCHASE_ISSUE_TYPES.DEFECTIVE]: "معیوب / خراب",
  [PURCHASE_ISSUE_TYPES.DAMAGED]: "آسیب‌دیده در حمل",
  [PURCHASE_ISSUE_TYPES.WRONG_ITEM]: "ارسال کالای اشتباه",
  [PURCHASE_ISSUE_TYPES.EXPIRED]: "تاریخ گذشته",
  [PURCHASE_ISSUE_TYPES.OTHER]: "سایر موارد",
};

export const PURCHASE_ISSUE_TYPE_STYLES = {
  [PURCHASE_ISSUE_TYPES.SHORTAGE]:
    "bg-amber-100 text-amber-800 border-amber-300",
  [PURCHASE_ISSUE_TYPES.DEFECTIVE]: "bg-red-100 text-red-800 border-red-300",
  [PURCHASE_ISSUE_TYPES.DAMAGED]:
    "bg-orange-100 text-orange-800 border-orange-300",
  [PURCHASE_ISSUE_TYPES.WRONG_ITEM]:
    "bg-purple-100 text-purple-800 border-purple-300",
  [PURCHASE_ISSUE_TYPES.EXPIRED]: "bg-gray-100 text-gray-800 border-gray-300",
  [PURCHASE_ISSUE_TYPES.OTHER]:
    "bg-slate-100 text-slate-800 border-slate-300",
};