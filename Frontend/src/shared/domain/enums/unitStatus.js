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
  /** در انبار ولی غیرقابل‌فروش، منتظر تصمیم — علتش در `UnitCustodyReasonEnum`. */
  QUARANTINED: 9,
});

export const UNIT_STATUS_LABELS = Object.freeze({
  [ProductUnitStatusEnum.IN_STOCK]: "در انبار",
  [ProductUnitStatusEnum.SOLD]: "فروخته‌شده",
  [ProductUnitStatusEnum.RETURNED_TO_SUPPLIER]: "عودت به تامین‌کننده",
  [ProductUnitStatusEnum.SCRAPPED]: "اسقاط",
  [ProductUnitStatusEnum.QUARANTINED]: "قرنطینه",
});

/**
 * `UnitCustodyReasonEnum` — چرا یک دانه در اختیار ماست.
 *
 * سه عضوِ اول از دریافتِ خرید می‌آیند و تکلیفشان با تامین‌کننده (مرجوعی
 * خرید) روشن می‌شود. دو عضوِ آخر درخواستِ سندِ
 * `Backend-Net/docs/product-unit-management-requirements.fa.md` (بند ۵) و
 * بند ۱۰ سندِ فروش‌اند: کالای معیوبِ برگشتی از مشتری، و دانه‌ای که انباردار
 * خودش از قفسه به قرنطینه برده — این دو را خودِ انبار تعیین تکلیف می‌کند.
 */
export const UnitCustodyReasonEnum = Object.freeze({
  ON_ORDER: 1,
  EXCESS: 2,
  UNLISTED: 3,
  CUSTOMER_RETURN: 4,
  WAREHOUSE_HOLD: 5,
});

export const UNIT_CUSTODY_REASON_LABELS = Object.freeze({
  [UnitCustodyReasonEnum.ON_ORDER]: "سهم سفارش",
  [UnitCustodyReasonEnum.EXCESS]: "مازاد",
  [UnitCustodyReasonEnum.UNLISTED]: "سفارش‌نداده",
  [UnitCustodyReasonEnum.CUSTOMER_RETURN]: "برگشتی از مشتری",
  [UnitCustodyReasonEnum.WAREHOUSE_HOLD]: "نگهداشت انبار",
});

/** قرنطینه‌ای که از دریافتِ خرید آمده و تکلیفش با مرجوعیِ خرید روشن می‌شود. */
export const PURCHASE_CUSTODY_REASONS = Object.freeze([
  UnitCustodyReasonEnum.ON_ORDER,
  UnitCustodyReasonEnum.EXCESS,
  UnitCustodyReasonEnum.UNLISTED,
]);
