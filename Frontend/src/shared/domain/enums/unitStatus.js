// src/shared/domain/enums/unitStatus.js

/**
 * `ProductUnitStatusEnum` — وضعیت یک دانه‌ی فیزیکی محصول (بخش ۱۵ سند
 * api-guide.fa.md). مقادیر دقیقاً همان اعداد بکند هستند.
 *
 * فرانت قبلاً چهار عضو اضافه هم داشت (`SHIPPED`, `DAMAGED`, `LOST`,
 * `RETURNED_BY_CUSTOMER`) که در بکند وجود ندارند. حذف شدند: وضعیتی که
 * سرور نمی‌شناسد، یا هرگز از سرور نمی‌آید یا موقع ارسال رد می‌شود، و
 * تنها کاری که می‌کرد این بود که UI حالتی را نشان بدهد که هیچ‌وقت
 * ذخیره نمی‌شود. اگر روزی بکند اضافه‌شان کرد، فقط همین فایل و
 * `UnitStatusBadge` تغییر می‌کنند.
 */
export const ProductUnitStatusEnum = Object.freeze({
  IN_STOCK: 1,
  SOLD: 2,
  /** بکند دارد؛ فرانت هنوز هیچ‌جا این وضعیت را تولید نمی‌کند (نیاز به
   *  اتصال به تصمیمِ مرجوعی خرید در سطح دانه — جدا انجام می‌شود). */
  RETURNED_TO_SUPPLIER: 3,
  SCRAPPED: 4,
});

export const UNIT_STATUS_LABELS = Object.freeze({
  [ProductUnitStatusEnum.IN_STOCK]: "در انبار",
  [ProductUnitStatusEnum.SOLD]: "فروخته‌شده",
  [ProductUnitStatusEnum.RETURNED_TO_SUPPLIER]: "عودت به تامین‌کننده",
  [ProductUnitStatusEnum.SCRAPPED]: "اسقاط",
});
