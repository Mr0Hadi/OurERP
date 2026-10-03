import { SaleStatusEnum } from "@/shared/domain/enums/saleStatus";

/**
 * قاعده‌های سندِ فروش — همان چیزی که بکند (`CreateSale`/`UpdateSale`/
 * `ShipSale`) با آن کار می‌کند، یک‌جا تا فرم‌ها از یک منبع بخوانند.
 */

/** آیا چیزی از این فروش به مشتری رفته است؟ */
export function hasAnythingShipped(sale) {
  return (sale?.items || []).some((item) => (Number(item.shippedQuantity) || 0) > 0);
}

/** وضعیت‌هایی که بکند روی آن‌ها مرجوعی می‌پذیرد (`CreateSaleReturn`). */
export const RETURNABLE_SALE_STATUSES = [
  SaleStatusEnum.PARTIALLY_DELIVERED,
  SaleStatusEnum.SHIPPED,
  SaleStatusEnum.DELIVERED,
];

/**
 * توضیحِ «پیش‌فاکتور / فاکتور» در فرمِ فروش (`DocumentKindPicker`). بکند
 * `status` را از فرم نمی‌گیرد: فروش با **اولین دریافت** فاکتور می‌شود (شماره را
 * خودش می‌سازد) و به صفِ ارسال می‌رود؛ پس «فاکتور» یعنی «با دریافتِ وجه ثبت کن».
 */
export const SALE_KIND_DESCRIPTIONS = {
  proforma: "برای اعلامِ قیمت به مشتری؛ بعداً هم ویرایش می‌شود و پرداخت ندارد.",
  invoice: "فاکتورِ قطعی با دریافتِ وجه؛ شماره را سیستم می‌سازد و به صفِ ارسالِ انبار می‌رود.",
};

/**
 * فاکتورِ فروش بی‌دریافت صادر نمی‌شود (بکند فروش را با اولین دریافت فاکتور
 * می‌کند — بندِ ۹.۱۱ سندِ درخواست‌ها)؛ پس «نسیه» در فاکتورِ تازه فعلاً بسته است.
 */
export const SALE_CREDIT_BLOCKED =
  "فاکتورِ فروش با اولین دریافت صادر می‌شود؛ برای فروشِ کاملاً نسیه پیش‌فاکتور ثبت کنید.";

/** تاریخِ فاکتور برای صدور الزامی است (شماره را بکند می‌سازد). */
export function missingSaleInvoiceFields(formData, isInvoice) {
  if (!isInvoice || formData.invoiceDate) return null;
  return { invoiceDate: "برای صدورِ فاکتور، تاریخ الزامی است" };
}
