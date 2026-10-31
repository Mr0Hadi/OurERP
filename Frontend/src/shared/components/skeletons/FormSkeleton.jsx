import { cn } from "@/shared/lib/utils";

/**
 * قطعاتِ اسکلتونِ صفحه‌های فرمِ جزئیات (مشتری، تامین‌کننده، کارمند، واحد، تیم، کالا) —
 * هم‌شکلِ `FormField` و `FormSectionCard` تا با رسیدنِ داده چیدمان نپرد.
 */

/** برچسب + ورودی. `height` برای Textarea (`h-20`) و مانندِ آن. */
export function FieldSkeleton({ labelWidth = "w-20", height = "h-10" }) {
  return (
    <div className="space-y-1.5">
      <div className={cn("h-4 bg-muted rounded", labelWidth)} />
      <div className={cn("bg-muted/50 rounded-lg", height)} />
    </div>
  );
}

/** دو فیلد کنارِ هم (یکی در موبایل). */
export function FieldPairSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FieldSkeleton />
      <FieldSkeleton labelWidth="w-24" />
    </div>
  );
}

/** کارتِ `FormSectionCard`: هدرِ آیکون‌دار + بدنه. */
export function FormCardSkeleton({ titleWidth = "w-32", className, children }) {
  return (
    <div className="border rounded-2xl overflow-hidden bg-card shadow-md">
      <div className="border-b bg-muted/30 py-4 px-6 flex items-center gap-3">
        <div className="h-9 w-9 bg-primary/10 rounded-xl" />
        <div className={cn("h-5 bg-muted rounded-lg", titleWidth)} />
      </div>
      <div className={cn("py-5 px-6 space-y-4", className)}>{children}</div>
    </div>
  );
}

/** دکمه‌های پایینِ فرم: «انصراف/ذخیره» کنارِ هم و در صورتِ نیاز یک دکمه‌ی تمام‌عرض. */
export function FormActionsSkeleton({ secondary = true }) {
  return (
    <>
      <div className="flex gap-2">
        <div className="h-9 flex-1 bg-muted/50 rounded-lg" />
        <div className="h-9 flex-1 bg-primary/20 rounded-lg" />
      </div>
      {secondary && <div className="h-9 w-full bg-muted/50 rounded-lg" />}
    </>
  );
}

/** پوسته‌ی دوستونیِ صفحه‌ی جزئیات؛ `start` ستونِ راست (RTL) و `end` ستونِ چپ. */
export function FormPageSkeleton({ start, end }) {
  return (
    <div className="container m-auto bg-background">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-pulse">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-4">
          <div className="lg:col-span-1 space-y-4">{start}</div>
          <div className="lg:col-span-1 space-y-4">{end}</div>
        </div>
      </div>
    </div>
  );
}
