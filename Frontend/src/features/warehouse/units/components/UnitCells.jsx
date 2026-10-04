import { Link } from "react-router-dom";
import { Printer, Tag } from "lucide-react";

import { ProductUnitStatusEnum as UNIT_STATUSES } from "@/shared/domain/enums/unitStatus";
import {
  DocumentKindEnum,
  LABELABLE_STATUSES,
  formatDate,
  whereaboutsOf,
  documentRouteOf,
  daysSince,
} from "../domain/unitVocabulary";
import { formatNumber } from "@/shared/lib/numberFormat";

/**
 * خانه‌های مشترکِ جدول و کارت‌های دانه — یک شکل در هر دو چیدمان.
 */

/** «کجاست؟» — جای فعلی و طرفِ حساب، با پیوند به سندِ فروش اگر هست. */
export function UnitWhereabouts({ unit, detailOnly = false }) {
  const where = whereaboutsOf(unit);
  const saleLink =
    unit.status === UNIT_STATUSES.SOLD ? documentRouteOf(DocumentKindEnum.SALE, unit.saleId) : null;

  return (
    <div className="flex min-w-0 flex-col">
      {/* کنارِ نشانِ وضعیت، خودِ جایگاه تکراری است؛ فقط جزئیات می‌آید. */}
      {!detailOnly && <span className="text-sm">{where.place}</span>}
      {(where.detail || where.document) && (
        <span className="truncate text-[11px] text-muted-foreground">
          {where.detail}
          {where.document &&
            (saleLink ? (
              <>
                {"، "}
                <Link to={saleLink} className="font-mono underline-offset-2 hover:underline">
                  {where.document}
                </Link>
              </>
            ) : (
              `، ${where.document}`
            ))}
        </span>
      )}
    </div>
  );
}

/**
 * وضعیتِ برچسب. فقط برای دانه‌ای که هنوز در انبار است «نخورده» هشدار است؛
 * دانه‌ای که رفته دیگر برچسب لازم ندارد.
 */
export function UnitLabelStateBadge({ unit, compact = false }) {
  if (unit.printCount > 0) {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs text-muted-foreground"
        title={
          unit.lastPrintedByName
            ? `آخرین چاپ توسط ${unit.lastPrintedByName}`
            : undefined
        }
      >
        <Printer className="h-3 w-3" />
        {formatNumber(unit.printCount)}×، {formatDate(unit.lastPrintedAt)}
      </span>
    );
  }
  if (!LABELABLE_STATUSES.includes(unit.status)) {
    return compact ? null : <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-warning/30 bg-warning/10 px-1.5 py-0.5 text-[11px] text-warning">
      <Tag className="h-3 w-3" />
      برچسب نخورده
    </span>
  );
}

/** چند روز است در قرنطینه مانده — بیش از ۳۰ روز یعنی تصمیمی عقب افتاده. */
export function UnitQuarantineAge({ unit }) {
  const days = daysSince(unit.quarantinedAt);
  if (days == null) return <span className="text-xs text-muted-foreground">—</span>;
  const stale = days > 30;
  return (
    <div className="flex flex-col">
      <span className={`text-sm tabular-nums ${stale ? "text-destructive font-medium" : ""}`}>
        {days === 0 ? "امروز" : `${formatNumber(days)} روز`}
      </span>
      <span className="text-[11px] text-muted-foreground">{formatDate(unit.quarantinedAt)}</span>
    </div>
  );
}
