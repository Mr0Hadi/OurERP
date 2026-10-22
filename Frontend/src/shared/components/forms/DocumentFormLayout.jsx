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

/**
 * چیدمانِ صفحه‌ی سندِ خرید/فروش: ستونِ اصلی (کارِ کاربر، به ترتیب) و ستونِ
 * کناری (اطلاعاتِ فاکتور، سند، جمع و ثبت). فقط یک اسکرول — خودِ صفحه. در عرضِ
 * کم همه زیرِ هم‌اند و کارتِ جمع و ثبت آخرِ صفحه است.
 *
 * `payments` (کارتِ پرداخت‌ها) در دسکتاپ آخرِ ستونِ اصلی است؛ در موبایل بین «سند
 * فاکتور/پیش‌فاکتور» و کارتِ جمع و ثبت (آخرین فرزندِ `aside`) می‌نشیند.
 *
 * `below` (اختیاری) زیرِ هر دو ستون و تمام‌عرض است — جزئیاتی که جای ستون ندارند (مثلاً تب‌های صندوق).
 *
 * کلِ صفحه یک `<form>` است؛ دکمه‌ی اصلیِ `OrderSummaryCard` آن را می‌فرستد.
 */
export default function DocumentFormLayout({ main, payments, aside, below, onSubmit }) {
  // submitِ فرمِ یک دیالوگ از portal در درختِ React تا اینجا بالا می‌آید؛
  // فقط submitِ خودِ همین فرم سند را ذخیره می‌کند.
  const handleSubmit = (event) => {
    if (event.target !== event.currentTarget) return;
    onSubmit(event);
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 space-y-4 animate-in fade-in duration-300"
    >
      {/* دو ستون فقط از xl: کمتر از آن ستونِ اصلی برای جدولِ اقلام جا ندارد. */}
      {/* زیر xl دو ستون `contents` اند تا فرزندان با `order` در یک جریان مرتب شوند. */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_23rem] gap-4 items-start">
        <div className="contents min-w-0 xl:flex xl:flex-col xl:gap-4">
          {main}
          {payments && <div className="order-1 min-w-0 xl:order-none">{payments}</div>}
        </div>
        {/* بی اسکرولِ جدا: فقط خودِ صفحه اسکرول می‌خورد. کارتِ جمع و ثبت آخرِ ستون است. */}
        <aside className="contents xl:flex xl:min-w-0 xl:flex-col xl:gap-4 max-xl:[&>:last-child]:order-2">
          {aside}
        </aside>
      </div>
      {below && <div className="min-w-0">{below}</div>}
    </form>
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
 * جمع و دکمه‌ی اصلیِ صفحه («ثبت» یا «ثبت تغییرات») — آخرین کارتِ ستونِ کناری. هر تغییری (اقلام، پرداخت، وضعیت، پیوست) فقط با همین
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
            <Button type="submit" className="flex-1 gap-2" disabled={isBusy || submitDisabled}>
              <Save className="size-4" />
              {isBusy ? pendingLabel : submitLabel}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
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
