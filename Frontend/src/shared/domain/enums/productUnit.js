// src/shared/domain/enums/productUnit.js

/**
 * `ProductUnitEnum` — واحد شمارش محصول (بخش ۱۵ سند api-guide.fa.md).
 * مقادیر باید دقیقاً با اعداد بکند یکی بمانند؛ روی سیم همیشه عدد است.
 */
export const ProductUnitEnum = Object.freeze({
  HAND: 0,
  NUMBER: 1,
  BOX: 2,
  LITER: 3,
  KG: 4,
  KIT: 5,
  PACKAGE: 6,
  PAIR: 7,
});

/** برچسب فارسی هر عضو، فقط برای نمایش در UI. */
export const PRODUCT_UNIT_LABELS = Object.freeze({
  [ProductUnitEnum.HAND]: "دست",
  [ProductUnitEnum.NUMBER]: "عدد",
  [ProductUnitEnum.BOX]: "کارتن",
  [ProductUnitEnum.LITER]: "لیتر",
  [ProductUnitEnum.KG]: "کیلوگرم",
  [ProductUnitEnum.KIT]: "کیت",
  [ProductUnitEnum.PACKAGE]: "بسته",
  [ProductUnitEnum.PAIR]: "جفت",
});

/**
 * واحدِ یک *خط سند* (قلم خرید/فروش/مرجوعی) — نه واحدِ خودِ کالا.
 *
 * این دو عمداً یکی نیستند و بکند هم همین تفکیک را دارد: `Product.unit`
 * یک enum عددی است (`"unit": 1`)، ولی `PurchaseReturnItem.unit` و
 * قرینه‌هایش رشته‌ی نمایشی‌اند (`"unit": "عدد"`) — چون خطِ سند یک
 * *عکسِ لحظه‌ای* از کالاست و باید حتی اگر بعداً واحدِ کالا عوض شد،
 * همان چیزی را نشان بدهد که موقع ثبت سند بوده.
 *
 * پس هرجا واحدِ کالا در یک خط سند کپی می‌شود باید از این تابع رد شود.
 * ورودیِ رشته‌ای (خط سندی که از قبل برچسب دارد) دست‌نخورده برمی‌گردد.
 */
export function unitLabelOf(unit) {
  return PRODUCT_UNIT_LABELS[unit] ?? unit ?? "";
}
