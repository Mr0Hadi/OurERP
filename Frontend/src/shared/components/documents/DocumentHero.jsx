import { Link } from "react-router-dom";
import { ArrowLeft, CalendarDays, CalendarClock, X } from "lucide-react";

import { Card } from "@/shared/components/ui/card";
import { formatNumber, formatRial } from "@/shared/lib/numberFormat";
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import { toneSolid, toneText } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";

/**
 * سرِ صفحه‌ی فاکتورِ صادرشده — هر چه کاربر با یک نگاه باید بداند: شماره،
 * طرف‌حساب، وضعیت، و وضعیتِ پول (جمع، پرداخت‌شده، مانده). کارهای سند
 * (مرجوعی، چاپ، تغییرِ وضعیت، لغو) هم همین‌جا کنارِ هم‌اند؛ قبلاً بینِ
 * چهار کارت در ستونِ کناری پخش بودند.
 *
 * وضعیتِ «ثبت‌نشده» (تغییرِ در انتظارِ `PendingChangesBar`) کنارِ وضعیتِ
 * فعلی با فلش دیده می‌شود و برگشت‌پذیر است.
 *
 * @param money `{ total, payable, paid, dueDate }` — `paid` با احتسابِ
 *   پرداخت‌های ثبت‌نشده.
 */
export default function DocumentHero({
  kindLabel,
  number,
  statusBadge,
  nextStatusBadge,
  onUndoStatus,
  help,
  party,
  date,
  paymentTypeBadge,
  money,
  actions,
  description,
}) {
  const payable = Number(money.payable ?? money.total) || 0;
  const remaining = payable - (Number(money.paid) || 0);
  const progress = payable > 0 ? Math.min(100, Math.max(0, (money.paid / payable) * 100)) : 100;

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4 p-4 sm:p-5">
        <div className="min-w-0 space-y-2">
          <p className="text-xs text-muted-foreground">{kindLabel}</p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tabular-nums" dir="auto">
              {number || "بدون شماره"}
            </h1>
            {statusBadge}
            {nextStatusBadge && (
              <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-primary/40 py-0.5 ps-1.5 pe-0.5">
                <ArrowLeft className="size-3 text-muted-foreground" aria-label="به" />
                {nextStatusBadge}
                <button
                  type="button"
                  onClick={onUndoStatus}
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="برگرداندنِ تغییرِ وضعیت"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}
            {help}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {party && (
              <span>
                {party.label}:{" "}
                {party.href ? (
                  <Link to={party.href} className="font-medium text-foreground hover:underline">
                    {party.name}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground">{party.name}</span>
                )}
              </span>
            )}
            {date && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3.5" aria-hidden />
                {gregorianToPersian(date)}
              </span>
            )}
            {paymentTypeBadge}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      <div className="border-t border-border bg-muted/30 px-4 py-3 sm:px-5">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <Figure label="جمع فاکتور" value={formatRial(money.total)} />
          {payable !== Number(money.total) ? (
            <Figure label="قابل پرداخت" value={formatRial(payable)} />
          ) : (
            <Figure
              label="سررسید"
              value={money.dueDate ? gregorianToPersian(money.dueDate) : "—"}
              icon={CalendarClock}
            />
          )}
          <Figure label="پرداخت‌شده" value={formatRial(money.paid)} />
          <Figure
            label={remaining < 0 ? "اضافه‌پرداخت" : "مانده"}
            value={remaining === 0 ? "تسویه" : formatRial(Math.abs(remaining))}
            className={toneText(remaining > 0 ? "warning" : remaining < 0 ? "info" : "success")}
            strong
          />
        </dl>
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${formatNumber(Math.round(progress))}٪ پرداخت شده`}
        >
          <div
            className={cn("h-full rounded-full transition-[width]", toneSolid(remaining > 0 ? "warning" : "success"))}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {description && (
        <p className="whitespace-pre-line border-t border-border px-4 py-3 text-sm text-muted-foreground sm:px-5">
          {description}
        </p>
      )}
    </Card>
  );
}

function Figure({ label, value, className, strong = false, icon: Icon }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-[11px] text-muted-foreground">
        {Icon && <Icon className="size-3" aria-hidden />}
        {label}
      </dt>
      <dd className={cn("mt-0.5 truncate tabular-nums", strong ? "text-base font-bold" : "text-sm font-medium", className)}>
        {value}
      </dd>
    </div>
  );
}
