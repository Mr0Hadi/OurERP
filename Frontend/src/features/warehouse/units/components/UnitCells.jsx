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
  fa,
} from "../domain/unitVocabulary";

/**
 * خانه‌های مشترکِ جدول و کارت‌های دانه — یک شکل در هر دو چیدمان.
 */

/**
 * بارکد به شکلِ خوانا (با خط‌تیره) — همان چیزی که زیرِ میله‌ها روی برچسب
 * چاپ شده، تا ردیف با برچسبِ توی دست تطبیق داده شود.
 */
export function UnitBarcodeCell({ unit }) {
  return (
    <div className="flex flex-col items-start">
      <span className="font-mono text-xs" dir="ltr">
        {unit.barcode}
      </span>
      <span className="text-[11px] tabular-nums text-muted-foreground">
        سریال {fa(unit.serialNumber)}
      </span>
    </div>
  );
}

export function UnitProductCell({ unit }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="truncate font-light">{unit.productName ?? "—"}</span>
      <span className="font-mono text-[11px] text-muted-foreground">{unit.productCode}</span>
    </div>
  );
}

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
        {fa(unit.printCount)}×، {formatDate(unit.lastPrintedAt)}
      </span>
    );
  }
  if (!LABELABLE_STATUSES.includes(unit.status)) {
    return compact ? null : <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
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
        {days === 0 ? "امروز" : `${fa(days)} روز`}
      </span>
      <span className="text-[11px] text-muted-foreground">{formatDate(unit.quarantinedAt)}</span>
    </div>
  );
}

/** سندی که دانه را به قرنطینه برد (دریافتِ خرید، مرجوعیِ فروش، یا دستی). */
export function UnitQuarantineSource({ unit }) {
  const link = documentRouteOf(unit.quarantineDocumentKind, unit.quarantineDocumentId);
  if (!unit.quarantineDocumentNumber) {
    return (
      <span className="text-xs text-muted-foreground">
        {unit.quarantineDocumentKind ? "—" : "انبار (دستی)"}
      </span>
    );
  }
  return link ? (
    <Link to={link} className="font-mono text-xs underline-offset-2 hover:underline">
      {unit.quarantineDocumentNumber}
    </Link>
  ) : (
    <span className="font-mono text-xs">{unit.quarantineDocumentNumber}</span>
  );
}

export function UnitValueCell({ value }) {
  if (value == null) return <span className="text-xs text-muted-foreground">—</span>;
  return <span className="text-sm tabular-nums">{fa(value)}</span>;
}
