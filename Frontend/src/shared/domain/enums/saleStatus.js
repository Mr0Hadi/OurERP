/**
 * `SalesStatusEnum` — وضعیت سند فروش (بخش ۱۵ سند api-guide.fa.md).
 * مقادیر باید دقیقاً با اعداد بکند یکی بمانند؛ روی سیم همیشه عدد است.
 *
 * اعداد به ترتیبِ خودِ چرخه‌ی کار شماره‌گذاری شده‌اند:
 * پیش‌فاکتور → آماده‌سازی انبار → ارسال ناقص → ارسال شده → تحویل کامل،
 * و «لغو شده» در انتها. به همین دلیل ترتیبِ کلیدهای عددی همان ترتیبِ
 * نمایش است و جایی لازم نیست دستی مرتب شود.
 *
 * عیناً همان `SalesStatusEnum`ِ بکند. `RETURNED` را فقط سرور می‌گذارد —
 * وقتی هر دانه‌ی ارسال‌شده‌ی فروش از راهِ مرجوعی تسویه شده باشد.
 */
export const SaleStatusEnum = Object.freeze({
  PROFORMA: 0,
  PROCESSING: 1,
  PARTIALLY_DELIVERED: 2,
  SHIPPED: 3,
  DELIVERED: 4,
  CANCELLED: 5,
  RETURNED: 6,
});

export const SALE_STATUS_LABELS = Object.freeze({
  [SaleStatusEnum.PROFORMA]: "پیش‌فاکتور",
  [SaleStatusEnum.PROCESSING]: "آماده‌سازی انبار",
  [SaleStatusEnum.PARTIALLY_DELIVERED]: "ارسال ناقص",
  [SaleStatusEnum.SHIPPED]: "ارسال شده",
  [SaleStatusEnum.DELIVERED]: "تحویل کامل",
  [SaleStatusEnum.CANCELLED]: "لغو شده",
  [SaleStatusEnum.RETURNED]: "مرجوع شده",
});

/**
 * هنوز پیش‌فاکتور است: فروشی که هنوز هیچ پولی بابتش جابه‌جا نشده، پس
 * شماره‌ی فاکتور رسمی ندارد.
 *
 * خروج از این وضعیت **دستی نیست**: با اولین پرداخت (`paidAmount > 0`)،
 * خودِ بکند در `CreateSale`/`UpdateSale` شماره‌ی فاکتور را می‌سازد، تاریخ
 * می‌زند و وضعیت را «آماده‌سازی انبار» می‌کند. فروشِ اقساطی با ثبتِ
 * قرارداد و پیش‌پرداخت نهایی می‌شود.
 */
export function isSaleProforma(status) {
  return Number(status) === SaleStatusEnum.PROFORMA;
}
