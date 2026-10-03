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

/** تاریخِ فاکتور برای صدور الزامی است (شماره را بکند می‌سازد). */
export function missingSaleInvoiceFields(formData, isInvoice) {
  if (!isInvoice || formData.invoiceDate) return null;
  return { invoiceDate: "برای صدورِ فاکتور، تاریخ الزامی است" };
}
