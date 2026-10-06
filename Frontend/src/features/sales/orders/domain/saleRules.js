import { SaleStatusEnum, SALE_STATUS_LABELS } from "@/shared/domain/enums/saleStatus";
import { SaleInstallmentPlanStatusEnum } from "@/shared/domain/enums/saleInstallment";
import { formatNumber, formatRial } from "@/shared/lib/numberFormat";

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

/** تاریخِ فاکتور برای صدور الزامی است (شماره را بکند می‌سازد). */
export function missingSaleInvoiceFields(formData, isInvoice) {
  if (!isInvoice || formData.invoiceDate) return null;
  return { invoiceDate: "برای صدورِ فاکتور، تاریخ الزامی است" };
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
 * قلمی که در فروشِ حضوری اسکنش کامل نیست (پیامِ اولی) یا `null`. کالای
 * ردیابی‌پذیر باید همه‌ی دانه‌هایش اسکن شود؛ بقیه یا همه یا هیچ.
 */
function inPersonScanProblem(items, scanned, isTracked) {
  for (const item of items) {
    const quantity = Number(item.quantity) || 0;
    const count = (scanned[item.productId] || []).length;
    if (isTracked(item.productId) && count !== quantity) {
      return `«${item.productName}» ردیابی‌پذیر است؛ همه‌ی ${formatNumber(quantity)} دانه را اسکن کنید`;
    }
    if (count > 0 && count !== quantity) {
      return `${formatNumber(count)} از ${formatNumber(quantity)} دانه‌ی «${item.productName}» اسکن شده؛ همه را اسکن یا تعداد را اصلاح کنید`;
    }
  }
  return null;
}

/**
 * نخستین دلیلی که ثبتِ فرمِ فروش را ناممکن می‌کند: `[پیام، بخشِ فرم]` یا `null`
 * (`reportFormProblem`).
 *
 * `forPos`: پیش از کارت‌کشیدن، وقتی دریافت هنوز نیامده؛ قاعده‌های دریافت (دریافتِ
 * کاملِ حضوری، «فاکتور با اولین دریافت») هنوز برقرار نیستند.
 *
 * فروشِ اقساطی (`planErrors` پُر یا خالی، نه `undefined`): فاکتور با پیش‌پرداختِ قرارداد صادر
 * می‌شود و تحویلِ حضوری هم با همان، پس قاعده‌های «دریافت» جایشان را به خطاهای قرارداد
 * (`planDraftErrors`) می‌دهند.
 *
 * @param isTracked `(productId) => boolean` — کالا ردیابیِ دانه دارد
 */
export function saleFormProblem({
  formData,
  items,
  invoiceErrors,
  isInvoice,
  isInPerson,
  scannedBarcodes,
  isTracked,
  paid,
  total,
  planErrors,
  forPos = false,
}) {
  if (!formData.customerId) return ["مشتری را انتخاب کنید.", "party"];
  if (items.length === 0) return ["دست‌کم یک کالا اضافه کنید.", "items"];
  if (invoiceErrors) return ["برای فاکتور، تاریخ را وارد کنید.", "info"];
  if (isInPerson) {
    const scanProblem = inPersonScanProblem(items, scannedBarcodes, isTracked);
    if (scanProblem) return [scanProblem, "items"];
  }
  if (planErrors) {
    const [first] = Object.values(planErrors);
    return isInvoice && first ? [`قرارداد اقساط: ${first}.`, "payment"] : null;
  }
  if (isInPerson) {
    if (paid < total && !forPos) {
      return [`در تحویلِ حضوری کلِ ${formatRial(total)} باید دریافت شود.`, "payment"];
    }
  }
  if (isInvoice && paid <= 0 && !forPos) {
    return ["فاکتورِ فروش با اولین دریافت صادر می‌شود؛ دریافت را ثبت کنید یا پیش‌فاکتور ثبت کنید.", "payment"];
  }
  return null;
}
