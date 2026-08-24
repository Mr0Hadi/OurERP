// src/shared/domain/enums/saleStatus.js

/**
 * `SalesStatusEnum` — وضعیت سند فروش (بخش ۱۵ سند api-guide.fa.md).
 * مقادیر باید دقیقاً با اعداد بکند یکی بمانند؛ روی سیم همیشه عدد است.
 */
export const SaleStatusEnum = Object.freeze({
  PENDING: 0,
  PROCESSING: 1,
  PARTIALLY_DELIVERED: 2,
  DELIVERED: 3,
  RETURNED: 4,
  CANCELLED: 5,
  SHIPPED: 6,
});

/**
 * برچسبِ نمایشی. عمداً `PENDING` را ندارد — فرانت از قبل این وضعیت را
 * با `PROCESSING` یکی فرض کرده («سفارش ثبت شده ولی هنوز چیزی از انبار
 * ارسال نشده») و فروش تازه هنوز فقط با `PROCESSING` ساخته می‌شود؛
 * `PENDING` هیچ‌وقت توسط فرانت تولید نمی‌شود، پس در فیلتر/Select هم
 * نباید به‌عنوان یک گزینه‌ی جدا کنار `PROCESSING` (با همین برچسب)
 * ظاهر شود. `RETURNED` را دارد چون طبق مستندِ بکند این وضعیت الان
 * واقعاً برمی‌گردد.
 */
export const SALE_STATUS_LABELS = Object.freeze({
  [SaleStatusEnum.PROCESSING]: "در حال پردازش",
  [SaleStatusEnum.PARTIALLY_DELIVERED]: "ارسال ناقص",
  [SaleStatusEnum.DELIVERED]: "تحویل کامل",
  [SaleStatusEnum.RETURNED]: "مرجوع شده",
  [SaleStatusEnum.CANCELLED]: "لغو شده",
  [SaleStatusEnum.SHIPPED]: "ارسال شده",
});
