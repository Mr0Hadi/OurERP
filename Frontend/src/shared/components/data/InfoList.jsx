import { cn } from "@/shared/lib/utils";

const VARIANTS = {
  plain: "space-y-1.5",
  boxed: "space-y-1.5 rounded-lg border border-border bg-muted/30 p-3",
  divided: "divide-y divide-border rounded-lg border border-border [&>div]:px-2.5 [&>div]:py-1.5",
};

/**
 * فهرستِ «برچسب … مقدار» (`<dl>`) — جزئیاتِ یک سند/دانه، ردیف‌های مبلغ در دیالوگ و کارت.
 * اندازه‌ی متن را `className` می‌دهد (`text-sm`، `text-xs`)؛ ردیف‌ها `InfoRow` اند.
 *
 * @param {"plain"|"boxed"|"divided"} [variant] بی‌قاب، قابِ خاکستری، یا قاب با خطِ بینِ ردیف‌ها
 */
export function InfoList({ variant = "plain", className, children }) {
  return <dl className={cn(VARIANTS[variant], className)}>{children}</dl>;
}

/**
 * یک ردیفِ «برچسب … مقدار»: برچسب کم‌رنگ در شروع، مقدار با رقمِ هم‌عرض در پایان.
 *
 * @param {React.ReactNode} label
 * @param {React.ReactNode} [value] یا `children`
 * @param {string} [className] کلِ ردیف (مثلاً رنگِ tone برای جریمه)
 * @param {string} [valueClassName] فقط مقدار (`font-medium`، `font-mono`)
 * @param {boolean} [total] ردیفِ جمعِ پایانی: خطِ بالا، برچسبِ پررنگ و مبلغِ درشت
 */
export function InfoRow({ label, value, children, className, valueClassName, total = false }) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-baseline justify-between gap-3",
        total && "border-t border-border pt-2",
        className,
      )}
    >
      <dt className={cn("shrink-0", total ? "font-medium" : "text-muted-foreground")}>{label}</dt>
      <dd className={cn("min-w-0 text-end tabular-nums", total && "text-base font-bold", valueClassName)}>
        {value ?? children}
      </dd>
    </div>
  );
}
