import { SaleStatusEnum, SALE_STATUS_LABELS } from "@/shared/domain/enums/saleStatus";
import { SaleInstallmentPlanStatusEnum } from "@/shared/domain/enums/saleInstallment";
import { formatNumber } from "@/shared/lib/numberFormat";

/**
 * قاعده‌های سندِ فروش — همان چیزی که بکند (`CreateSale`/`UpdateSale`/
 * `ShipSale`/`ChangeSaleStatus`) با آن کار می‌کند، یک‌جا تا فرم و نمای فاکتور از
 * یک منبع بخوانند.
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
 * لغو فقط پیش از هر ارسالی و بی قرارداد اقساطیِ جاری (`ChangeSaleStatus` آن را ۴۰۰ می‌دهد؛
 * اول قرارداد ابطال شود).
 */
export const canCancelSale = (sale) =>
  sale.status !== SaleStatusEnum.CANCELLED &&
  sale.status !== SaleStatusEnum.DELIVERED &&
  sale.installmentSummary?.status !== SaleInstallmentPlanStatusEnum.ACTIVE &&
  !hasAnythingShipped(sale);

/**
 * گزینه‌های وضعیتِ فروشِ صادرشده. `ChangeSaleStatus` دستی فقط «ارسال شده → تحویل
 * کامل» و لغو را می‌پذیرد؛ «ارسال ناقص/ارسال شده» را ارسالِ انبار می‌گذارد.
 */
export function saleStatusOptions(sale) {
  const current = sale.status;
  return [
    { value: current, label: SALE_STATUS_LABELS[current] },
    ...(current === SaleStatusEnum.SHIPPED
      ? [{ value: SaleStatusEnum.DELIVERED, label: SALE_STATUS_LABELS[SaleStatusEnum.DELIVERED] }]
      : []),
    ...(canCancelSale(sale) ? [{ value: SaleStatusEnum.CANCELLED, label: "لغو فروش" }] : []),
  ];
}

// ─── فروشِ حضوری ────────────────────────────────────────────────────────────

/**
 * دانه‌هایی که در اقلام اسکن شده‌اند (`{ [productId]: string[] }`). اسکنِ دانه
 * یعنی کالا همین‌جا دستِ مشتری است: «فروشِ حضوری».
 */
export function scannedBarcodesOf(items) {
  return Object.fromEntries(
    items
      .filter((item) => item.productUnitBarcodes?.length)
      .map((item) => [item.productId, item.productUnitBarcodes]),
  );
}

/**
 * قلمی که در فروشِ حضوری اسکنش کامل نیست (پیامِ اولی) یا `null`. فروشِ حضوری بررسیِ انبار را
 * با همین دانه‌ها انجام می‌دهد (`CheckSaleWarehouse` برای هر ردیف دقیقاً به‌اندازه‌ی تعدادش
 * بارکد می‌خواهد)، پس همه‌ی دانه‌های همه‌ی اقلام — ردیابی‌پذیر یا نه — باید اسکن شوند.
 */
function inPersonScanProblem(items, scanned) {
  const need = {};
  for (const item of items) need[item.productId] = (need[item.productId] || 0) + (Number(item.quantity) || 0);
  for (const item of items) {
    const count = (scanned[item.productId] || []).length;
    const quantity = need[item.productId];
    if (count !== quantity) {
      return `فروشِ حضوری: ${formatNumber(count)} از ${formatNumber(quantity)} دانه‌ی «${item.productName}» اسکن شده؛ همه‌ی دانه‌های همه‌ی اقلام را اسکن کنید (یا اسکن‌ها را پاک کنید تا پیش‌فاکتور ثبت شود)`;
    }
  }
  return null;
}

/**
 * نخستین دلیلی که ثبتِ پیش‌فاکتور (تازه یا ذخیره‌ی تغییرات) را ناممکن می‌کند: `[پیام، بخشِ فرم]` یا `null`
 * (`reportFormProblem`). قاعده‌های دریافت جدایند (`useProformaPayment`).
 *
 * @param isInPerson فروشِ تازه با دانه‌های اسکن‌شده — همه‌ی دانه‌ها باید اسکن شده باشند
 */
export function saleFormProblem({ formData, items, isInPerson = false, scannedBarcodes = {} }) {
  if (!formData.customerId) return ["مشتری را انتخاب کنید.", "party"];
  if (items.length === 0) return ["دست‌کم یک کالا اضافه کنید.", "items"];
  if (isInPerson) {
    const scanProblem = inPersonScanProblem(items, scannedBarcodes);
    if (scanProblem) return [scanProblem, "items"];
  }
  return null;
}
