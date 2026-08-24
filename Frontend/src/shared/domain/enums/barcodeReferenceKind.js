// src/shared/domain/enums/barcodeReferenceKind.js

/**
 * `BarcodeReferenceKindEnum` — نتیجه‌ی تفسیر یک بارکد اسکن‌شده (بخش ۱۵
 * سند api-guide.fa.md). قبلاً در فرانت اصلاً به‌عنوان یک enum رسمی
 * وجود نداشت — نتیجه‌ی اسکن با رشته‌های دستیِ "unit"/"product"/"none"
 * نمایش داده می‌شد. اینجا برای اولین‌بار رسمی و عددی شده.
 *
 * `UNKNOWN` طبق سند در پاسخِ موفق هرگز دیده نمی‌شود (سرور خودش ۴۰۴
 * می‌دهد)؛ اینجا برای mock که موفقیت را شبیه‌سازی نمی‌کند نگه داشته شده.
 */
export const BarcodeReferenceKindEnum = Object.freeze({
  PRODUCT: 1,
  UNIT: 2,
  UNKNOWN: 3,
});
