/**
 * `SalesStatusEnum` — وضعیت سند فروش (بخش ۱۵ سند api-guide.fa.md).
 * مقادیر باید دقیقاً با اعداد بکند یکی بمانند؛ روی سیم همیشه عدد است.
 *
 * اعداد به ترتیبِ خودِ چرخه‌ی کار شماره‌گذاری شده‌اند:
 * پیش‌فاکتور → آماده‌سازی انبار → ارسال ناقص → ارسال شده → تحویل کامل،
 * و «لغو شده» در انتها. به همین دلیل ترتیبِ کلیدهای عددی همان ترتیبِ
 * نمایش است و جایی لازم نیست دستی مرتب شود.
 *
 * ✅ بکند از ۲۰۲۶-۰۹-۰۲ همین شماره‌گذاری را دارد. تنها تفاوت،
 * `RETURNED = 6` است که فقط سمتِ بکند وجود دارد (با تسویه‌ی کاملِ یک
 * مرجوعی ست می‌شود) و اینجا برچسبی ندارد — چنین فروشی بدون برچسب
 * نمایش داده می‌شود.
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
 * هنوز پیش‌فاکتور است: هیچ پولی بابتش گرفته نشده، پس شماره‌ی فاکتور
 * رسمی ندارد و تنها وضعیتی است که فروش در آن ویرایش می‌شود.
 *
 * خروج از این وضعیت **دستی نیست**: اولین ریالِ پرداخت (`CreateSale` با
 * `paymentDetails` یا `AddSalePayment`) شماره‌ی فاکتور را می‌سازد، تاریخ
 * می‌زند و وضعیت را «آماده‌سازی انبار» می‌کند. یک‌طرفه است: ابطالِ
 * پرداخت فروش را به پیش‌فاکتور برنمی‌گرداند، پس «پیش‌فاکتور» را معادلِ
 * «بدون پرداخت» نگیرید و برای قفل فقط به `status` نگاه کنید.
 */
export function isSaleProforma(status) {
  return Number(status) === SaleStatusEnum.PROFORMA;
}
