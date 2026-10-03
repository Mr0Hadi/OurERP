import { Save } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { formatNumber, formatRial } from "@/shared/lib/numberFormat";
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
 * جمع و دکمه‌ی اصلیِ صفحه («ثبت» یا «ثبت تغییرات») — بالای ستونِ کناری تا با
 * اسکرول از دید نرود. هر تغییری (اقلام، پرداخت، وضعیت، پیوست) فقط با همین
 * دکمه ذخیره می‌شود.
 *
 * @param totals `{ netAmount, taxAmount, totalAmount, taxUnknown }`
 * @param footer کارِ ثانویه (حذفِ پیش‌فاکتور، ثبتِ مرجوعی)
 */
export function OrderSummaryCard({
  title,
  badge,
  itemCount,
  totals,
  submitLabel,
  pendingLabel = "در حال ذخیره...",
  isBusy,
  submitDisabled = false,
  onCancel,
  cancelLabel = "انصراف",
  footer,
  canSubmit = true,
}) {
  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {badge && <CardAction>{badge}</CardAction>}
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="space-y-2 text-sm">
          <Row label={`اقلام (${formatNumber(itemCount)})`} value={formatNumber(totals.netAmount)} />
          {totals.taxAmount > 0 && <Row label="مالیات" value={formatNumber(totals.taxAmount)} />}
          <div className="flex items-baseline justify-between gap-2 border-t border-border pt-2">
            <dt className="font-medium">جمع کل</dt>
            <dd className="text-base font-bold tabular-nums">{formatRial(totals.totalAmount)}</dd>
          </div>
          {totals.taxUnknown && (
            <p className="text-[11px] leading-5 text-muted-foreground">
              مالیاتِ کالاهای تازه را سرور هنگامِ ثبت حساب می‌کند.
            </p>
          )}
        </dl>

        {canSubmit && (
          <div className="flex gap-2">
            {/* روی موبایل دکمه‌ی ثبت در نوارِ پایین است. */}
            <Button type="submit" className="hidden flex-1 gap-2 lg:flex" disabled={isBusy || submitDisabled}>
              <Save className="size-4" />
              {isBusy ? pendingLabel : submitLabel}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                className="flex-1 lg:flex-none"
                onClick={onCancel}
                disabled={isBusy}
              >
                {cancelLabel}
              </Button>
            )}
          </div>
        )}
        {footer && <div className="space-y-1 border-t border-border pt-3">{footer}</div>}
      </CardContent>
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
export function DocumentMobileBar({ total, submitLabel, pendingLabel = "در حال ذخیره...", isBusy, submitDisabled = false }) {
  return (
    <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 py-3">
      <div className="flex items-center gap-3 max-w-3xl mx-auto">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-muted-foreground">جمع کل</p>
          <p className="text-sm font-semibold tabular-nums truncate">{formatRial(total)}</p>
        </div>
        <Button type="submit" className="gap-2" disabled={isBusy || submitDisabled}>
          <Save className="size-4" />
          {isBusy ? pendingLabel : submitLabel}
        </Button>
      </div>
    </div>
  );
}
