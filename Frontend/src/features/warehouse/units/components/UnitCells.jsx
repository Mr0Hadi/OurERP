import { Link } from "react-router-dom";
import { Printer, Tag } from "lucide-react";

import StatusBadge from "@/shared/components/status/StatusBadge";
import { LABELABLE_STATUSES, formatDate, whereaboutsOf, daysSince } from "../domain/unitVocabulary";
import { formatNumber } from "@/shared/lib/numberFormat";
import { cn } from "@/shared/lib/utils";

/**
 * خانه‌های مشترکِ جدول، کارت‌ها و برگه‌ی جزئیاتِ دانه — یک شکل در همه‌جا.
 */

/**
 * «کجاست؟» — جای فعلی، طرفِ حساب یا علت، و سندِ مرتبط (با پیوند اگر هست).
 *
 * `detailOnly`: کنارِ نشانِ وضعیت، خودِ جایگاه تکراری است؛ فقط جزئیات می‌آید.
 * `stacked`: هر بخش یک خط (ردیفِ «کجاست»ِ برگه‌ی جزئیات)؛ پیش‌فرض یک خطِ فشرده.
 */
export function UnitWhereabouts({ unit, detailOnly = false, stacked = false }) {
  const where = whereaboutsOf(unit);
  const documentText = where.document && (
    where.documentRoute ? (
      <Link to={where.documentRoute} className="font-mono underline-offset-2 hover:underline">
        {where.document}
      </Link>
    ) : (
      <span className="font-mono">{where.document}</span>
    )
  );

  if (stacked) {
    return (
      <>
        <span className="font-medium">{where.place}</span>
        {where.detail && <span className="block text-[11px] text-muted-foreground">{where.detail}</span>}
        {documentText && <span className="block text-[11px] text-muted-foreground">{documentText}</span>}
      </>
    );
  }

  return (
    <div className="flex min-w-0 flex-col">
      {!detailOnly && <span className="text-sm">{where.place}</span>}
      {(where.detail || documentText) && (
        <span className="truncate text-[11px] text-muted-foreground">
          {where.detail}
          {where.detail && documentText && "، "}
          {documentText}
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
        title={unit.lastPrintedByName ? `آخرین چاپ توسط ${unit.lastPrintedByName}` : undefined}
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
    <StatusBadge tone="warning" size="sm" icon={Tag}>
      برچسب نخورده
    </StatusBadge>
  );
}

/** روزهایی که دانه در قرنطینه مانده و بیش از آن تصمیمی عقب افتاده است. */
const STALE_QUARANTINE_DAYS = 30;

/** چند روز است در قرنطینه مانده. */
export function UnitQuarantineAge({ unit }) {
  const days = daysSince(unit.quarantinedAt);
  if (days == null) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex flex-col">
      <span
        className={cn(
          "text-sm tabular-nums",
          days > STALE_QUARANTINE_DAYS && "text-destructive font-medium",
        )}
      >
        {days === 0 ? "امروز" : `${formatNumber(days)} روز`}
      </span>
      <span className="text-[11px] text-muted-foreground">{formatDate(unit.quarantinedAt)}</span>
    </div>
  );
}
