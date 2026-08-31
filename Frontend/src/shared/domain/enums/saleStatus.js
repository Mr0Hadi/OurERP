// src/shared/domain/enums/saleStatus.js

/**
 * `SalesStatusEnum` — وضعیت سند فروش (بخش ۱۵ سند api-guide.fa.md).
 * مقادیر باید دقیقاً با اعداد بکند یکی بمانند؛ روی سیم همیشه عدد است.
 *
 * اعداد به ترتیبِ خودِ چرخه‌ی کار شماره‌گذاری شده‌اند:
 * پیش‌فاکتور → آماده‌سازی انبار → ارسال ناقص → ارسال شده → تحویل کامل،
 * و «لغو شده» در انتها. به همین دلیل ترتیبِ کلیدهای عددی همان ترتیبِ
 * نمایش است و جایی لازم نیست دستی مرتب شود.
 *
 * ⚠️ این شماره‌گذاری با ترتیبِ قبلیِ بکند یکی نیست و باید همان‌جا هم
 * به‌روز شود.
 */
export const SaleStatusEnum = Object.freeze({
  PROFORMA: 0,
  PROCESSING: 1,
  PARTIALLY_DELIVERED: 2,
  SHIPPED: 3,
  DELIVERED: 4,
  CANCELLED: 5,
});

export const SALE_STATUS_LABELS = Object.freeze({
  [SaleStatusEnum.PROFORMA]: "پیش‌فاکتور",
  [SaleStatusEnum.PROCESSING]: "آماده‌سازی انبار",
  [SaleStatusEnum.PARTIALLY_DELIVERED]: "ارسال ناقص",
  [SaleStatusEnum.SHIPPED]: "ارسال شده",
  [SaleStatusEnum.DELIVERED]: "تحویل کامل",
  [SaleStatusEnum.CANCELLED]: "لغو شده",
});

/**
 * هنوز پیش‌فاکتور است: فروش ثبت شده ولی مشتری تأییدش نکرده، پس هنوز
 * شماره‌ی فاکتور رسمی ندارد. با تغییر وضعیت به «آماده‌سازی انبار»،
 * بکند فاکتور و شماره‌اش را می‌سازد.
 */
export function isSaleProforma(status) {
  return Number(status) === SaleStatusEnum.PROFORMA;
}
