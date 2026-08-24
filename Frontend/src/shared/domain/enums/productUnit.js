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
