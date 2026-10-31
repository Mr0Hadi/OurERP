import { baseFontPt } from "@/shared/components/print/typography";
import { invoiceLineAmounts, invoiceTotals } from "@/shared/domain/invoice/lineMath";
import { gregorianToPersian, todayIso } from "@/shared/lib/dateUtils";
import { formatNumber } from "@/shared/lib/numberFormat";

/** زیرِ این عرضِ مفید (میلی‌متر) جدول جا نمی‌شود و هر قلم دو سطری چاپ می‌شود (رولِ حرارتی، A5 افقیِ تنگ…). */
const COMPACT_BELOW_MM = 100;

function Totals({ totals, compact }) {
  return (
    <dl className={compact ? "space-y-0.5" : "ms-auto w-[22em] max-w-full space-y-1"}>
      <div className="flex justify-between gap-3">
        <dt>جمعِ پس از تخفیف</dt>
        <dd className="tabular-nums">{formatNumber(totals.netAmount)}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt>مالیات بر ارزش افزوده{totals.taxUnknown && " (تقریبی)"}</dt>
        <dd className="tabular-nums">{formatNumber(totals.taxAmount)}</dd>
      </div>
      <div className="flex justify-between gap-3 border-t border-black/40 pt-1 text-[1.15em] font-bold">
        <dt>مبلغِ قابلِ پرداخت</dt>
        <dd className="tabular-nums">{formatNumber(totals.totalAmount)} ریال</dd>
      </div>
    </dl>
  );
}

/** هر قلم دو سطر: نام، و «تعداد × قیمت = مبلغ» — برای کاغذِ باریک. */
function CompactLines({ items, columns }) {
  return (
    <ol className="divide-y divide-dashed divide-black/30">
      {items.map((item, index) => {
        const line = invoiceLineAmounts(item);
        return (
          <li key={`${item.productId}-${index}`} className="py-1">
            <p className="font-medium">
              {formatNumber(index + 1)}. {item.productName}
            </p>
            {columns.code && item.productCode && <p className="font-mono text-[0.8em] text-black/60">{item.productCode}</p>}
            <p className="flex justify-between gap-2 tabular-nums">
              <span>
                {columns.quantity && `${formatNumber(item.quantity)} × `}
                {columns.unitPrice && formatNumber(item.unitPrice)}
                {columns.discount && Number(item.discount) > 0 && ` (−${formatNumber(item.discount)}٪)`}
              </span>
              {columns.lineTotal && <span className="font-medium">{formatNumber(line.netAmount)}</span>}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function TableLines({ items, columns }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-black/40 text-right">
          <th className="py-1.5 pe-2 font-semibold">#</th>
          <th className="py-1.5 pe-2 font-semibold">کالا</th>
          {columns.quantity && <th className="py-1.5 pe-2 text-center font-semibold">تعداد</th>}
          {columns.unitPrice && <th className="py-1.5 pe-2 text-left font-semibold">قیمتِ واحد</th>}
          {columns.discount && <th className="py-1.5 pe-2 text-center font-semibold">تخفیف</th>}
          {columns.lineTotal && <th className="py-1.5 text-left font-semibold">مبلغ (ریال)</th>}
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => {
          const line = invoiceLineAmounts(item);
          return (
            <tr key={`${item.productId}-${index}`} className="break-inside-avoid border-b border-black/15 align-top">
              <td className="py-1.5 pe-2 tabular-nums">{formatNumber(index + 1)}</td>
              <td className="py-1.5 pe-2">
                {item.productName}
                {columns.code && item.productCode && (
                  <span className="block font-mono text-[0.8em] text-black/55">{item.productCode}</span>
                )}
              </td>
              {columns.quantity && <td className="py-1.5 pe-2 text-center tabular-nums">{formatNumber(item.quantity)}</td>}
              {columns.unitPrice && <td className="py-1.5 pe-2 text-left tabular-nums">{formatNumber(item.unitPrice)}</td>}
              {columns.discount && (
                <td className="py-1.5 pe-2 text-center tabular-nums">
                  {Number(item.discount) ? `${formatNumber(item.discount)}٪` : "—"}
                </td>
              )}
              {columns.lineTotal && <td className="py-1.5 text-left tabular-nums">{formatNumber(line.netAmount)}</td>}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * متنِ برگه‌ی «لیست قیمت‌ها» از اقلامِ فرمِ فروش — فقط نمایش، بی‌state. روی
 * کاغذِ باریک (رول) به‌جای جدول فهرستِ دوسطری می‌شود.
 *
 * @param settings     تنظیماتِ برگه (`PRICE_LIST_DEFAULTS` در `PriceListPrint`)
 * @param contentWidthMm عرضِ مفیدِ کاغذ — برای انتخابِ جدول یا فهرست
 */
export default function PriceListDocument({ items, settings, customerName, contentWidthMm }) {
  const compact = contentWidthMm < COMPACT_BELOW_MM;
  const totals = invoiceTotals(items);
  const { columns } = settings;
  const businessName = settings.businessName.trim();
  const customer = customerName.trim();
  const note = settings.footerNote.trim();

  return (
    <div dir="rtl" className="space-y-[1.2em] leading-[1.6]" style={{ fontSize: `${baseFontPt(settings.textScale)}pt` }}>
      <header
        className={
          compact
            ? "space-y-0.5 border-b border-dashed border-black/40 pb-2 text-center"
            : "flex items-start justify-between gap-4 border-b border-black/25 pb-3"
        }
      >
        <div>
          {businessName && <p className="text-[1.1em] font-bold">{businessName}</p>}
          <h1 className={businessName ? "font-semibold" : "text-[1.35em] font-bold"}>{settings.title.trim() || "لیست قیمت‌ها"}</h1>
          {settings.showDisclaimer && (
            <p className="mt-0.5 text-[0.85em] text-black/60">قیمت‌ها و موجودی تا تأییدِ نهایی و بررسیِ انبار قطعی نیست.</p>
          )}
        </div>
        <div className={compact ? "text-[0.9em]" : "shrink-0 space-y-0.5 text-[0.9em]"}>
          <p>تاریخ: {gregorianToPersian(todayIso())}</p>
          {customer && <p>مشتری: {customer}</p>}
        </div>
      </header>

      {compact ? <CompactLines items={items} columns={columns} /> : <TableLines items={items} columns={columns} />}

      {settings.showTotals && <Totals totals={totals} compact={compact} />}

      {note && <p className="whitespace-pre-line border-t border-black/20 pt-2 text-[0.9em]">{note}</p>}
    </div>
  );
}
