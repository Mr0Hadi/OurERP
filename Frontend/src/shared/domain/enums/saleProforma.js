/**
 * چرخه‌ی تأییدِ پیش‌فاکتورِ فروش (بخش ۱۱ و ۱۵ سندِ api-guide.fa.md، از ۲۰۲۶-۱۰-۱۶).
 * مرحله‌ها داخلِ `status = PROFORMA`اند: پیش‌نویس → تأیید مشتری (صفِ انبار) → تأیید انبار
 * (دانه‌ها رزرو، آماده‌ی پرداخت). اولین پرداخت فاکتور را صادر می‌کند.
 */

/** `SaleProformaStageEnum`. */
export const SaleProformaStageEnum = Object.freeze({
  DRAFT: 0,
  CUSTOMER_APPROVED: 1,
  WAREHOUSE_CHECKED: 2,
});

export const SALE_PROFORMA_STAGE_LABELS = Object.freeze({
  [SaleProformaStageEnum.DRAFT]: "پیش‌نویس",
  [SaleProformaStageEnum.CUSTOMER_APPROVED]: "در انتظار انبار",
  [SaleProformaStageEnum.WAREHOUSE_CHECKED]: "آماده‌ی پرداخت",
});

export const SALE_PROFORMA_STAGE_TONES = Object.freeze({
  [SaleProformaStageEnum.DRAFT]: "neutral",
  [SaleProformaStageEnum.CUSTOMER_APPROVED]: "caution",
  [SaleProformaStageEnum.WAREHOUSE_CHECKED]: "success",
});

/** `SaleProformaEventEnum` — رویدادهای `proformaEvents`. */
export const SaleProformaEventEnum = Object.freeze({
  CUSTOMER_APPROVED: 1,
  WAREHOUSE_CHECKED: 2,
  WAREHOUSE_SHORTAGE: 3,
  RESET_BY_EDIT: 4,
  RESERVATION_EXPIRED: 5,
});

export const SALE_PROFORMA_EVENT_TONES = Object.freeze({
  [SaleProformaEventEnum.CUSTOMER_APPROVED]: "info",
  [SaleProformaEventEnum.WAREHOUSE_CHECKED]: "success",
  [SaleProformaEventEnum.WAREHOUSE_SHORTAGE]: "danger",
  [SaleProformaEventEnum.RESET_BY_EDIT]: "neutral",
  [SaleProformaEventEnum.RESERVATION_EXPIRED]: "caution",
});

/** `SaleWarehouseIssueResolutionEnum` — تصمیمِ حسابداری روی گزارشِ انبار. */
export const SaleWarehouseIssueResolutionEnum = Object.freeze({
  RELEASE: 1,
  SCRAP: 2,
  SUPPLIER_RETURN: 3,
});

export const SALE_WAREHOUSE_ISSUE_RESOLUTION_LABELS = Object.freeze({
  [SaleWarehouseIssueResolutionEnum.RELEASE]: "بازگشت به موجودی",
  [SaleWarehouseIssueResolutionEnum.SCRAP]: "اسقاط و ثبت زیان",
  [SaleWarehouseIssueResolutionEnum.SUPPLIER_RETURN]: "نگهداری برای مرجوعی به تامین‌کننده",
});
