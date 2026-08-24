// src/shared/domain/enums/purchaseStatus.js

/**
 * `PurchaseStatusEnum` — وضعیت سند خرید (بخش ۱۵ سند api-guide.fa.md).
 * مقادیر باید دقیقاً با اعداد بکند یکی بمانند؛ روی سیم همیشه عدد است.
 */
export const PurchaseStatusEnum = Object.freeze({
  PENDING: 0,
  SHIPPED: 1,
  PARTIALLY_RECEIVED: 2,
  RECEIVED: 3,
  RETURNED: 4,
  CANCELLED: 5,
});

/**
 * برچسبِ نمایشی. عمداً `RETURNED` را ندارد — طبق سند بکند این وضعیت در
 * عمل هنوز به آن نمی‌رسد (فعلاً هیچ‌جا آن را ست نمی‌کند)، و ماژول
 * مرجوعی خرید که قاعدتاً باید آن را نشان بدهد جدا انجام می‌شود.
 */
export const PURCHASE_STATUS_LABELS = Object.freeze({
  [PurchaseStatusEnum.PENDING]: "در انتظار ارسال",
  [PurchaseStatusEnum.SHIPPED]: "ارسال شده",
  [PurchaseStatusEnum.PARTIALLY_RECEIVED]: "تحویل ناقص",
  [PurchaseStatusEnum.RECEIVED]: "تحویل کامل",
  [PurchaseStatusEnum.CANCELLED]: "لغو شده",
});
