// src/shared/domain/enums/unitStatus.js

/**
 * `ProductUnitStatusEnum` — وضعیت یک دانه‌ی فیزیکی محصول (بخش ۱۵ سند
 * api-guide.fa.md). فقط ۴ عضوِ اول را بکند دارد؛ مقادیرشان دقیقاً با
 * بکند یکی است.
 *
 * فرانت از قبل ۴ وضعیتِ دیگر هم دارد که بکند هنوز ندارد — طبق تصمیم،
 * همه‌شان عددی شدند تا وقتی بکند این‌ها را اضافه کرد فقط کافی باشد
 * همین‌جا مقدارشان را با عددِ بکند هماهنگ کنیم؛ خودِ enum و مصرف‌کننده‌هایش
 * دست نمی‌خورند. `RETURNED` قبلاً به `RETURNED_BY_CUSTOMER` تغییر نام
 * داد چون با `RETURNED_TO_SUPPLIER` بکند اسم مشترک ولی معنای متضاد
 * داشت (این یکی «مشتری پسش داد»، آن یکی «ما به تامین‌کننده پسش دادیم»).
 */
export const ProductUnitStatusEnum = Object.freeze({
  // ── اعضای مشترک با بکند ──
  IN_STOCK: 1,
  SOLD: 2,
  /** بکند دارد؛ فرانت هنوز هیچ‌جا این وضعیت را تولید نمی‌کند (نیاز به
   *  اتصال به تصمیمِ مرجوعی خرید در سطح دانه — جدا انجام می‌شود). */
  RETURNED_TO_SUPPLIER: 3,
  SCRAPPED: 4,

  // ── فقط فرانت — باید بعداً از بکند خواسته شود اضافه شوند ──
  SHIPPED: 5,
  DAMAGED: 6,
  LOST: 7,
  RETURNED_BY_CUSTOMER: 8,
});

export const UNIT_STATUS_LABELS = Object.freeze({
  [ProductUnitStatusEnum.IN_STOCK]: "در انبار",
  [ProductUnitStatusEnum.SOLD]: "فروخته‌شده",
  [ProductUnitStatusEnum.SHIPPED]: "ارسال‌شده",
  [ProductUnitStatusEnum.RETURNED_BY_CUSTOMER]: "مرجوعی",
  [ProductUnitStatusEnum.DAMAGED]: "آسیب‌دیده",
  [ProductUnitStatusEnum.LOST]: "مفقود",
  [ProductUnitStatusEnum.SCRAPPED]: "اسقاط",
  // RETURNED_TO_SUPPLIER عمداً برچسب ندارد — هنوز جایی رندر نمی‌شود.
});

/** وضعیت‌هایی که انباردار می‌تواند دستی بگذارد. */
export const MANUAL_UNIT_STATUSES = [
  ProductUnitStatusEnum.DAMAGED,
  ProductUnitStatusEnum.LOST,
  ProductUnitStatusEnum.SCRAPPED,
  ProductUnitStatusEnum.IN_STOCK,
];
