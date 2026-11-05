import { baseFontPt } from "@/shared/components/print/typography";
import { gregorianToPersianDateTime } from "@/shared/lib/dateUtils";
import { formatNumber } from "@/shared/lib/numberFormat";
import { countSheetShowsSystem } from "../domain/stocktake";
import StocktakeScopeText from "./StocktakeScopeText";

/** خانه‌ی خالی برای نوشتنِ دستی؛ ارتفاعش با متن بزرگ می‌شود. */
function BlankCell({ className = "" }) {
  return <td className={`border border-black/40 ${className}`} />;
}

function Signature({ label }) {
  return (
    <div className="flex-1 space-y-[2.5em]">
      <p>{label}</p>
      <p className="border-t border-black/40 pt-0.5 text-[0.85em] text-black/60">نام و امضا</p>
    </div>
  );
}

/**
 * متنِ برگه‌ی شمارش — فقط نمایش، بی‌state. هر کالا یک ردیف با خانه‌ی خالیِ «شمرده‌شده» و «توضیح» تا شمارنده روی
 * کاغذ بنویسد و بعد در صفحه وارد کند. در شمارشِ کور ستونِ موجودیِ سیستم هرگز نمی‌آید (سرور هم نمی‌فرستد).
 *
 * @param lines    ردیف‌های انتخاب‌شده (`countSheetLines`)
 * @param settings تنظیماتِ برگه (`COUNT_SHEET_DEFAULTS` در `StocktakeCountSheetPrint`)
 */
export default function StocktakeCountSheetDocument({ stocktake, lines, settings }) {
  const showSystem = countSheetShowsSystem(stocktake, settings);
  const showRecorded = Boolean(settings.showRecordedCount);
  const businessName = settings.businessName.trim();
  const note = settings.footerNote.trim();

  return (
    <div dir="rtl" className="space-y-[1.2em] leading-[1.6]" style={{ fontSize: `${baseFontPt(settings.textScale)}pt` }}>
      <header className="flex items-start justify-between gap-4 border-b border-black/25 pb-3">
        <div className="min-w-0">
          {businessName && <p className="text-[1.1em] font-bold">{businessName}</p>}
          <h1 className={businessName ? "font-semibold" : "text-[1.35em] font-bold"}>
            {settings.title.trim() || "برگه‌ی شمارش"}
          </h1>
          <p className="font-semibold">{stocktake.title}</p>
        </div>
        <dl className="shrink-0 space-y-0.5 text-[0.9em]">
          <div className="flex gap-1">
            <dt>شماره:</dt>
            <dd className="font-mono" dir="ltr">
              {stocktake.number}
            </dd>
          </div>
          {stocktake.warehouseName && (
            <div className="flex gap-1">
              <dt>انبار:</dt>
              <dd>{stocktake.warehouseName}</dd>
            </div>
          )}
          <div className="flex gap-1">
            <dt>دامنه:</dt>
            <dd>
              <StocktakeScopeText stocktake={stocktake} />
            </dd>
          </div>
          <div className="flex gap-1">
            <dt>موجودیِ مبنا:</dt>
            <dd>{gregorianToPersianDateTime(stocktake.snapshotAt)}</dd>
          </div>
          <div className="flex gap-1">
            <dt>تعدادِ کالا:</dt>
            <dd className="tabular-nums">{formatNumber(lines.length)}</dd>
          </div>
        </dl>
      </header>

      {stocktake.isBlind && (
        <p className="text-[0.85em] text-black/60">شمارشِ کور: آنچه روی قفسه می‌بینید بنویسید؛ موجودیِ سیستم روی برگه نیست.</p>
      )}

      {lines.length === 0 ? (
        <p className="py-6 text-center text-black/60">کالایی برای شمارش نمانده است.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-right">
              <th className="w-[2.5em] border border-black/40 px-1 py-1 text-center font-semibold">#</th>
              <th className="border border-black/40 px-1.5 py-1 font-semibold">کالا</th>
              {showSystem && <th className="w-[5em] border border-black/40 px-1 py-1 text-center font-semibold">سیستم</th>}
              {showRecorded && <th className="w-[5em] border border-black/40 px-1 py-1 text-center font-semibold">ثبت‌شده</th>}
              <th className="w-[6em] border border-black/40 px-1 py-1 text-center font-semibold">شمرده‌شده</th>
              <th className="w-[30%] border border-black/40 px-1.5 py-1 font-semibold">توضیح</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={line.id} className="break-inside-avoid align-top">
                <td className="border border-black/40 px-1 py-1.5 text-center tabular-nums">{formatNumber(index + 1)}</td>
                <td className="border border-black/40 px-1.5 py-1.5">
                  {line.productName}
                  <span className="block font-mono text-[0.8em] text-black/55" dir="ltr">
                    {line.productCode}
                  </span>
                </td>
                {showSystem && (
                  <td className="border border-black/40 px-1 py-1.5 text-center tabular-nums">
                    {line.systemQuantity == null ? "—" : formatNumber(line.systemQuantity)}
                  </td>
                )}
                {showRecorded && (
                  <td className="border border-black/40 px-1 py-1.5 text-center tabular-nums">
                    {line.countedQuantity == null ? "—" : formatNumber(line.countedQuantity)}
                  </td>
                )}
                <BlankCell />
                <BlankCell />
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {note && <p className="whitespace-pre-line border-t border-black/20 pt-2 text-[0.9em]">{note}</p>}

      {settings.showSignatures && (
        <div className="flex break-inside-avoid gap-8 pt-[1em]">
          <Signature label="شمارنده" />
          <Signature label="ناظر / انباردار" />
        </div>
      )}
    </div>
  );
}
