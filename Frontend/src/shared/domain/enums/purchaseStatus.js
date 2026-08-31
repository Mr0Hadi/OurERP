// src/shared/domain/enums/purchaseStatus.js

/**
 * `PurchaseStatusEnum` — وضعیت سند خرید (بخش ۱۵ سند api-guide.fa.md).
 * مقادیر باید دقیقاً با اعداد بکند یکی بمانند؛ روی سیم همیشه عدد است.
 *
 * اعداد به ترتیبِ خودِ چرخه‌ی کار شماره‌گذاری شده‌اند:
 * پیش‌فاکتور → در انتظار ارسال → ارسال شده → تحویل ناقص → تحویل کامل،
 * و «لغو شده» در انتها. پس ترتیبِ کلیدهای عددی همان ترتیبِ نمایش است.
 *
 * در «پیش‌فاکتور» هنوز فاکتور رسمیِ تامین‌کننده نرسیده؛ کاربر پیش‌فاکتور
 * را ضمیمه می‌کند. وقتی فاکتور رسید، شماره‌اش را وارد و خودِ فاکتور را
 * ضمیمه می‌کند و وضعیت را به «در انتظار ارسال» می‌برد.
 *
 * ⚠️ این شماره‌گذاری با ترتیبِ قبلیِ بکند یکی نیست و باید همان‌جا هم
 * به‌روز شود.
 */
export const PurchaseStatusEnum = Object.freeze({
  PROFORMA: 0,
  PENDING: 1,
  SHIPPED: 2,
  PARTIALLY_RECEIVED: 3,
  RECEIVED: 4,
  CANCELLED: 5,
});

export const PURCHASE_STATUS_LABELS = Object.freeze({
  [PurchaseStatusEnum.PROFORMA]: "پیش‌فاکتور",
  [PurchaseStatusEnum.PENDING]: "در انتظار ارسال",
  [PurchaseStatusEnum.SHIPPED]: "ارسال شده",
  [PurchaseStatusEnum.PARTIALLY_RECEIVED]: "تحویل ناقص",
  [PurchaseStatusEnum.RECEIVED]: "تحویل کامل",
  [PurchaseStatusEnum.CANCELLED]: "لغو شده",
});

/** هنوز پیش‌فاکتور است؛ فاکتور رسمیِ تامین‌کننده نرسیده. */
export function isPurchaseProforma(status) {
  return Number(status) === PurchaseStatusEnum.PROFORMA;
}
