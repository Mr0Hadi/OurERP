/**
 * `BarcodeReferenceKindEnum` — نتیجه‌ی تفسیر یک بارکد اسکن‌شده (بخش ۱۵
 * سند api-guide.fa.md). مقادیر دقیقاً همان اعداد بکند هستند.
 *
 * `UNKNOWN` طبق سند در پاسخِ موفق هرگز دیده نمی‌شود (سرور خودش ۴۰۴
 * می‌دهد)؛ فقط برای mock نگه داشته شده که موفقیت را شبیه‌سازی نمی‌کند.
 */
export const BarcodeReferenceKindEnum = Object.freeze({
  PRODUCT: 1,
  UNIT: 2,
  UNKNOWN: 3,
});
