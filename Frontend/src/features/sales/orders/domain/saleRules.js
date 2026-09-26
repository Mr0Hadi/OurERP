import { SaleStatusEnum } from "@/shared/domain/enums/saleStatus";

/**
 * قاعده‌های سندِ فروش — همان چیزی که بکند (`CreateSale`/`UpdateSale`/
 * `ShipSale`) با آن کار می‌کند، یک‌جا تا فرم‌ها از یک منبع بخوانند.
 */

/** آیا چیزی از این فروش به مشتری رفته است؟ */
export function hasAnythingShipped(sale) {
  return (sale?.items || []).some((item) => (Number(item.shippedQuantity) || 0) > 0);
}

/**
 * وضعیت‌هایی که روی یک فروشِ ذخیره‌شده دستی قابل انتخاب‌اند.
 *
 *  - پیش‌فاکتور: خروجش دستی نیست — سرور با اولین پرداخت شماره‌ی فاکتور
 *    را می‌سازد و فروش را «آماده‌سازی انبار» می‌کند.
 *  - «ارسال ناقص» و «ارسال شده» را فقط ارسالِ انبار (`ShipSale`) تعیین
 *    می‌کند.
 *  - تنها قدمِ دستیِ رو به جلو «ارسال شده → تحویل کامل» است.
 *  - «لغو» فقط تا وقتی چیزی ارسال نشده.
 *  - «تحویل کامل»، «لغو شده» و «مرجوع شده» پایانی‌اند.
 *
 * همیشه وضعیتِ فعلی هم در فهرست است تا کشویی مقدار داشته باشد.
 */
export function manualSaleStatusOptions(sale) {
  const current = Number(sale?.status);
  const options = [current];
  if (current === SaleStatusEnum.SHIPPED) options.push(SaleStatusEnum.DELIVERED);
  if (
    (current === SaleStatusEnum.PROFORMA || current === SaleStatusEnum.PROCESSING) &&
    !hasAnythingShipped(sale)
  ) {
    options.push(SaleStatusEnum.CANCELLED);
  }
  return options;
}

/** راهنمای کوتاهِ زیرِ کشوییِ وضعیت، بسته به وضعیتِ فعلی. */
export function saleStatusHint(status) {
  switch (Number(status)) {
    case SaleStatusEnum.PROFORMA:
      return "با ثبتِ اولین پرداخت، سرور شماره‌ی فاکتور رسمی را می‌سازد و فروش را به «آماده‌سازی انبار» می‌برد.";
    case SaleStatusEnum.PROCESSING:
    case SaleStatusEnum.PARTIALLY_DELIVERED:
      return "«ارسال ناقص» و «ارسال شده» را ارسالِ کالا از انبار تعیین می‌کند.";
    case SaleStatusEnum.SHIPPED:
      return "وقتی مشتری کالا را تحویل گرفت، وضعیت را «تحویل کامل» کنید.";
    default:
      return "این وضعیت پایانی است و دستی عوض نمی‌شود.";
  }
}

/** وضعیت‌هایی که بکند روی آن‌ها مرجوعی می‌پذیرد (`CreateSaleReturn`). */
export const RETURNABLE_SALE_STATUSES = [
  SaleStatusEnum.PARTIALLY_DELIVERED,
  SaleStatusEnum.SHIPPED,
  SaleStatusEnum.DELIVERED,
];

/**
 * حذف فقط وقتی که هیچ کالایی از انبار خارج نشده — بعد از آن دانه‌ها و
 * دفترِ هزینه به این فروش اشاره می‌کنند و راهِ درست لغو یا مرجوعی است.
 */
export function canDeleteSale(sale) {
  if (!sale) return false;
  const status = Number(sale.status);
  return (
    (status === SaleStatusEnum.PROFORMA || status === SaleStatusEnum.PROCESSING) &&
    !hasAnythingShipped(sale)
  );
}
