import { ScanBarcode, X } from "lucide-react";
import { barcodeSegments, formatPayload } from "@/shared/domain/barcode/productCode";
import { formatNumber } from "@/shared/lib/numberFormat";

/**
 * دانه‌های اسکن‌شده‌ی یک قلم، داخلِ همان ردیفِ اقلام.
 *
 * کالا در خودِ ردیف پیداست، پس هر چیپ فقط بخش‌های متمایزِ بارکد را نشان
 * می‌دهد: شماره‌ی دانه (پررنگ) و تاریخِ برچسب. کدِ کامل در title است.
 * چیپ‌ها در شبکه‌ی هم‌اندازه می‌نشینند تا در موبایل مرتب بمانند.
 */
export default function ScannedUnitCodes({ codes = [], quantity, onRemove, className = "" }) {
  if (!codes?.length) return null;
  const total = Number(quantity) || 0;
  const isComplete = codes.length === total;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          <ScanBarcode className="h-3.5 w-3.5" />
          دانه‌های اسکن‌شده
        </p>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium tabular-nums ${
            isComplete
              ? "bg-success/10 text-success"
              : "bg-warning/10 text-warning"
          }`}
        >
          {formatNumber(codes.length)} از {formatNumber(total)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
        {codes.map((code) => {
          const [date, , serial] = barcodeSegments(code);
          return (
            <div
              key={code}
              title={formatPayload(code)}
              className="flex min-w-0 items-center justify-between gap-1 rounded-md border border-border bg-card px-2 py-1"
            >
              <span dir="ltr" className="min-w-0 font-mono leading-tight">
                <span className="block truncate text-xs font-semibold text-card-foreground">
                  #{serial != null ? Number(serial) : code}
                </span>
                {date && serial != null && (
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {date}
                  </span>
                )}
              </span>
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(code)}
                  className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`حذف دانه ${formatPayload(code)}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
