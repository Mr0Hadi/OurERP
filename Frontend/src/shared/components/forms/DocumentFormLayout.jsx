import { Circle, CircleCheck, Save } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { formatNumber, formatRial } from "@/shared/lib/numberFormat";
import { toneText } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";

/**
 * چیدمانِ صفحه‌ی سندِ خرید/فروش: ستونِ اصلی (کارِ کاربر، به ترتیب) و ستونِ
 * کناریِ چسبان (خلاصه و دکمه‌ی ثبت). روی موبایل همه زیرِ هم و یک نوارِ
 * ثابتِ پایین (جمع + ثبت) همیشه در دسترس است.
 *
 * بی `onSubmit` فقط چیدمان است (نمای فاکتورِ صادرشده)؛ با آن یک `<form>`.
 *
 * @param top       بالای هر دو ستون، تمام‌عرض (سرِ فاکتورِ صادرشده)
 * @param mobileBar نوارِ ثابتِ پایینِ موبایل (`DocumentMobileBar`)
 * @param footer    زیرِ ستون‌ها (مثلاً `PendingChangesBar`ِ چسبان)
 */
export default function DocumentFormLayout({ top, main, aside, mobileBar, footer, onSubmit }) {
  // submitِ فرمِ یک دیالوگ از portal در درختِ React تا اینجا بالا می‌آید؛
  // فقط submitِ خودِ همین فرم سند را ذخیره می‌کند.
  const handleSubmit = (event) => {
    if (event.target !== event.currentTarget) return;
    onSubmit(event);
  };
  const Root = onSubmit ? "form" : "div";

  return (
    <Root
      onSubmit={onSubmit ? handleSubmit : undefined}
      noValidate={onSubmit ? true : undefined}
      className={cn(
        "container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 animate-in fade-in duration-300",
        mobileBar ? "pb-28 lg:pb-6" : "pb-6",
      )}
    >
      {top}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem] gap-4 items-start">
        <div className="space-y-4 min-w-0">{main}</div>
        {/* چسبان، ولی اگر بلندتر از صفحه شد خودش اسکرول می‌خورد. */}
        <aside className="space-y-4 min-w-0 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:p-0.5 custom-scroll">
          {aside}
        </aside>
      </div>
      {footer}
      {mobileBar}
    </Root>
  );
}

/**
 * بخشِ ستونِ اصلی با شناسه، تا خطای ثبت به همان بخش اسکرول کند
 * (`scrollToSection` در `shared/lib/scrollToSection.js`).
 */
export function FormSection({ name, children }) {
  return (
    <section id={`section-${name}`} className="scroll-mt-20">
      {children}
    </section>
  );
}

/**
 * خلاصه و ثبتِ سند در ستونِ کناری: مبالغ، وضعیتِ پرداخت، آنچه پیش از ثبت
 * کم است، و دکمه‌ها. چک‌لیست فقط وقتی چیزی کم است دیده می‌شود — کاربر قبل
 * از کلیک می‌داند چرا ثبت نمی‌شود.
 *
 * @param totals    خروجیِ `invoiceTotals`
 * @param payment   `{ paid, remaining, remainingLabel }` یا `null` (پیش‌فاکتور)
 * @param checklist `[{ key, label, done, section }]`
 * @param footer    کارِ ثانویه (مثلاً حذفِ پیش‌فاکتور)
 */
export function OrderSummaryCard({
  title,
  badge,
  itemCount,
  totals,
  payment,
  checklist = [],
  submitLabel,
  pendingLabel = "در حال ثبت...",
  isBusy,
  onCancel,
  cancelLabel = "انصراف",
  footer,
  canSubmit = true,
}) {
  const missing = checklist.filter((entry) => !entry.done);

  return (
    <Card className="gap-0 py-0">
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {badge}
      </div>

      <dl className="space-y-2 px-4 pb-4 text-sm">
        <Row label={`اقلام (${formatNumber(itemCount)})`} value={formatNumber(totals.netAmount)} />
        {totals.taxAmount > 0 && <Row label="مالیات" value={formatNumber(totals.taxAmount)} />}
        <div className="flex items-baseline justify-between gap-2 border-t border-border pt-3">
          <dt className="font-medium">مبلغ کل</dt>
          <dd className="text-lg font-bold tabular-nums">{formatRial(totals.totalAmount)}</dd>
        </div>
        {totals.taxUnknown && (
          <p className="text-[11px] leading-5 text-muted-foreground">
            مالیاتِ کالاهای تازه را سرور هنگامِ ثبت حساب می‌کند.
          </p>
        )}
        {payment && totals.totalAmount > 0 && (
          <div className="space-y-2 rounded-lg bg-muted/50 px-3 py-2.5">
            <Row label="پرداخت" value={formatNumber(payment.paid)} />
            <div className="flex items-baseline justify-between gap-2">
              <dt className="text-muted-foreground">{payment.remainingLabel ?? "مانده"}</dt>
              <dd
                className={cn(
                  "font-semibold tabular-nums",
                  toneText(payment.remaining > 0 ? "warning" : "success"),
                )}
              >
                {payment.remaining > 0 ? formatNumber(payment.remaining) : "تسویه"}
              </dd>
            </div>
          </div>
        )}
      </dl>

      {canSubmit && (
        <div className="space-y-3 border-t border-border bg-muted/20 px-4 py-4">
          {missing.length > 0 && (
            <ul className="space-y-1.5" aria-label="پیش از ثبت">
              {checklist.map((entry) => (
                <li
                  key={entry.key}
                  className={cn(
                    "flex items-start gap-2 text-xs leading-5",
                    entry.done ? "text-muted-foreground" : "text-card-foreground",
                  )}
                >
                  {entry.done ? (
                    <CircleCheck className={cn("mt-0.5 size-3.5 shrink-0", toneText("success"))} />
                  ) : (
                    <Circle className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  )}
                  {entry.label}
                </li>
              ))}
            </ul>
          )}
          {/* روی موبایل دکمه‌ی ثبت در نوارِ پایین است. */}
          <Button type="submit" size="lg" className="hidden lg:flex w-full gap-2" disabled={isBusy}>
            <Save className="size-4" />
            {isBusy ? pendingLabel : submitLabel}
          </Button>
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={onCancel}
              disabled={isBusy}
            >
              {cancelLabel}
            </Button>
          )}
        </div>
      )}
      {footer && <div className="border-t border-border px-4 py-2">{footer}</div>}
    </Card>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

/** نوارِ ثابتِ پایینِ موبایل: جمع و ثبت، همیشه در دسترس. */
export function DocumentMobileBar({ total, submitLabel, pendingLabel = "در حال ثبت...", isBusy }) {
  return (
    <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 py-3">
      <div className="flex items-center gap-3 max-w-3xl mx-auto">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-muted-foreground">مبلغ کل</p>
          <p className="text-sm font-semibold tabular-nums truncate">{formatRial(total)}</p>
        </div>
        <Button type="submit" size="lg" className="gap-2" disabled={isBusy}>
          <Save className="size-4" />
          {isBusy ? pendingLabel : submitLabel}
        </Button>
      </div>
    </div>
  );
}
