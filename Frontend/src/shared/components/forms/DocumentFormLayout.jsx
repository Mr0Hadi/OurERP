import { Save, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { formatNumber, formatRial } from "@/shared/lib/numberFormat";

/**
 * چیدمانِ مشترکِ فرمِ ثبت/ویرایشِ سندِ خرید و فروش.
 *
 * ترتیب همان ترتیبِ کار است: طرف‌حساب ← اقلام ← اطلاعات فاکتور ← ضمیمه
 * در ستونِ اصلی، و وضعیت/پرداخت/جمع/ثبت در ستونِ کناری. روی موبایل
 * همه زیرِ هم با همین ترتیب می‌آیند و یک نوارِ ثابتِ پایین (جمع + ذخیره)
 * همیشه در دسترس است؛ قبلاً طرف‌حساب و دکمه‌ی ذخیره زیرِ کلِ کاتالوگِ
 * کالا گم می‌شدند.
 *
 * ستونِ کناری روی دسکتاپ چسبان است تا جمع و دکمه‌ی ذخیره با اسکرولِ
 * اقلام از دید نروند.
 *
 * @param main      کارت‌های ستونِ اصلی
 * @param aside     کارت‌های ستونِ کناری (معمولاً `DocumentSummaryCard` + پرداخت)
 * @param mobileBar نوارِ پایینِ موبایل (`DocumentMobileBar`)
 */
export default function DocumentFormLayout({ main, aside, mobileBar, onSubmit }) {
  // submitِ فرمِ یک دیالوگ (مثلاً ثبتِ پرداخت) از portal در درختِ React تا
  // اینجا بالا می‌آید؛ فقط submitِ خودِ همین فرم سند را ذخیره می‌کند.
  const handleSubmit = (event) => {
    if (event.target !== event.currentTarget) return;
    onSubmit(event);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 lg:pb-6 animate-in fade-in duration-300"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-4 min-w-0">{main}</div>
        <div className="space-y-4 lg:sticky lg:top-4">{aside}</div>
      </div>
      {mobileBar}
    </form>
  );
}

/**
 * جمع و دکمه‌های ثبت در ستونِ کناری. `children` بالای جمع می‌نشیند
 * (انتخابِ وضعیت).
 */
export function DocumentSummaryCard({
  title = "خلاصه و ثبت",
  children,
  itemCount,
  totals,
  totalLabel = "جمع کل",
  submitLabel,
  pendingLabel = "در حال ذخیره...",
  isBusy,
  onCancel,
}) {
  return (
    <Card>
      <CardHeader className="pb-0">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}

        <dl className="space-y-1.5 text-sm border-t border-border pt-3">
          <div className="flex justify-between gap-2 text-muted-foreground">
            <dt>تعداد اقلام</dt>
            <dd className="tabular-nums">{formatNumber(itemCount)}</dd>
          </div>
          {totals.taxAmount > 0 && (
            <div className="flex justify-between gap-2 text-muted-foreground">
              <dt>مالیات</dt>
              <dd className="tabular-nums">{formatRial(totals.taxAmount)}</dd>
            </div>
          )}
          <div className="flex justify-between gap-2 font-semibold text-card-foreground">
            <dt>{totalLabel}</dt>
            <dd className="tabular-nums">{formatRial(totals.totalAmount)}</dd>
          </div>
          {totals.taxUnknown && (
            <p className="text-[11px] text-muted-foreground">
              مالیاتِ بعضی اقلام هنوز معلوم نیست؛ جمعِ نهایی را سرور حساب می‌کند.
            </p>
          )}
        </dl>

        {/* روی موبایل همین دکمه‌ها در نوارِ پایین‌اند. */}
        <div className="hidden lg:flex gap-2">
          <Button type="submit" className="flex-1 gap-2" disabled={isBusy}>
            <Save className="h-4 w-4" />
            {isBusy ? pendingLabel : submitLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={onCancel}
            disabled={isBusy}
          >
            <X className="h-4 w-4" />
            انصراف
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** نوارِ ثابتِ پایینِ موبایل: جمع و ذخیره، همیشه در دسترس. */
export function DocumentMobileBar({ total, submitLabel, pendingLabel = "در حال ذخیره...", isBusy }) {
  return (
    <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 py-3">
      <div className="flex items-center gap-3 max-w-3xl mx-auto">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-muted-foreground">جمع کل</p>
          <p className="text-sm font-semibold tabular-nums truncate">{formatRial(total)}</p>
        </div>
        <Button type="submit" className="gap-2" disabled={isBusy}>
          <Save className="h-4 w-4" />
          {isBusy ? pendingLabel : submitLabel}
        </Button>
      </div>
    </div>
  );
}
