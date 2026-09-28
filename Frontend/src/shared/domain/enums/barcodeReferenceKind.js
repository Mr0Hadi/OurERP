/**
 * `BarcodeReferenceKindEnum` — نتیجه‌ی تفسیر یک بارکد اسکن‌شده (بخش ۱۵
 * سند api-guide.fa.md). مقادیر دقیقاً همان اعداد بکند هستند.
 *
 * `UNKNOWN` طبق سند در پاسخِ موفقِ سرور هرگز دیده نمی‌شود (سرور خودش ۴۰۴
 * می‌دهد)؛ فرانت آن را برای تفسیرِ محلیِ کد (`parseBarcode`) به کار می‌برد:
 * کدی که شکلِ هیچ بارکدِ شناخته‌شده‌ای را ندارد اصلاً به سرور فرستاده نمی‌شود.
 */
export const BarcodeReferenceKindEnum = Object.freeze({
  PRODUCT: 1,
  UNIT: 2,
  UNKNOWN: 3,
});
