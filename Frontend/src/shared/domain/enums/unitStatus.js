/**
 * `ProductUnitStatusEnum` — وضعیت یک دانه‌ی فیزیکی محصول (بخش ۱۵ سند
 * api-guide.fa.md). مقادیر دقیقاً همان اعداد بکند هستند.
 *
 * فهرست عمداً از بکند جلو نمی‌زند: وضعیتی که سرور نمی‌شناسد یا هرگز
 * نمی‌آید یا موقع ارسال رد می‌شود. ۵ تا ۸ در بکند عمداً خالی مانده‌اند.
 */
export const ProductUnitStatusEnum = Object.freeze({
  IN_STOCK: 1,
  SOLD: 2,
  RETURNED_TO_SUPPLIER: 3,
  SCRAPPED: 4,
  /** در انبار ولی غیرقابل‌فروش، منتظر تصمیم: معیوبِ سهمِ سفارش، مازاد یا کالای سفارش‌نداده. */
  QUARANTINED: 9,
});

export const UNIT_STATUS_LABELS = Object.freeze({
  [ProductUnitStatusEnum.IN_STOCK]: "در انبار",
  [ProductUnitStatusEnum.SOLD]: "فروخته‌شده",
  [ProductUnitStatusEnum.RETURNED_TO_SUPPLIER]: "عودت به تامین‌کننده",
  [ProductUnitStatusEnum.SCRAPPED]: "اسقاط",
  [ProductUnitStatusEnum.QUARANTINED]: "قرنطینه",
});

/** `UnitCustodyReasonEnum` — چرا یک دانه در اختیار ماست. */
export const UnitCustodyReasonEnum = Object.freeze({
  ON_ORDER: 1,
  EXCESS: 2,
  UNLISTED: 3,
});

export const UNIT_CUSTODY_REASON_LABELS = Object.freeze({
  [UnitCustodyReasonEnum.ON_ORDER]: "سهم سفارش",
  [UnitCustodyReasonEnum.EXCESS]: "مازاد",
  [UnitCustodyReasonEnum.UNLISTED]: "سفارش‌نداده",
});
