import { Undo2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";

/**
 * خانه‌های جدولِ صفِ دریافت/ارسال برای کالای مرجوعی (`useQueueRows`).
 *
 * ردیفِ مرجوعیِ جدا `__return: true` دارد (`isReturnRow`)؛ ردیفِ خرید/فروشی که
 * جایگزینِ مرجوعی منتظرش است `replacementReturnNumbers` دارد.
 */

const RETURN_BADGE_CLASS =
  "gap-1 font-normal border-amber-500/40 text-amber-700 dark:text-amber-400";

/** ستونِ اول: شماره‌ی سند، و شماره‌ی مرجوعی زیرش. */
export function QueueNumberCell({ row }) {
  if (row.__return) {
    return (
      <div className="space-y-0.5">
        <span className="font-mono text-xs">{row.returnNumber}</span>
        {row.invoiceNumber && (
          <p className="text-[11px] text-muted-foreground">فاکتور {row.invoiceNumber}</p>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-0.5">
      <span className="font-mono text-xs text-muted-foreground">{row.invoiceNumber}</span>
      {row.replacementReturnNumbers?.map((number) => (
        <p key={number} className="font-mono text-[11px] text-amber-700 dark:text-amber-400">
          مرجوعی {number}
        </p>
      ))}
    </div>
  );
}

/** ستونِ «وضعیت» برای ردیفِ مرجوعیِ جدا: نوعِ کار. */
export function ReturnKindBadge({ row }) {
  return (
    <Badge variant="outline" className={RETURN_BADGE_CLASS}>
      <Undo2 className="h-3 w-3" />
      {row.sideLabel}
    </Badge>
  );
}

/** زیرِ وضعیتِ یک خرید/فروش: کالای جایگزینِ مرجوعی همراهِ همین دریافت/ارسال. */
export function PendingReplacementNote({ row }) {
  if (!row.replacementReturnNumbers?.length) return null;
  return (
    <Badge variant="outline" className={`mt-1 text-[11px] ${RETURN_BADGE_CLASS}`}>
      <Undo2 className="h-3 w-3" />
      + جایگزینِ مرجوعی
    </Badge>
  );
}

export function ReturnActionCell({ row, navigate }) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1"
      disabled={!row.link}
      onClick={() => navigate(row.link)}
    >
      <Undo2 className="h-4 w-4" />
      {row.actionLabel}
    </Button>
  );
}
