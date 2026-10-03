import { Card, CardContent } from "@/shared/components/ui/card";
import { formatNumber } from "@/shared/lib/numberFormat";
import { cn } from "@/shared/lib/utils";

/**
 * کارتِ یک بخش از صفحه‌ی سند (خرید/فروش) — یک سرتیتر برای همه‌ی بخش‌ها تا
 * صفحه یک‌دست خوانده شود.
 *
 * در فرمِ ثبت، `step` شماره‌ی قدم را نشان می‌دهد (طرف‌حساب ← اقلام ←
 * مشخصات ← پرداخت) تا ترتیبِ کار بی‌توضیح معلوم باشد؛ در نمای فاکتور به‌جایش
 * آیکن می‌آید.
 *
 * @param step        شماره‌ی قدم (اختیاری)
 * @param icon        کامپوننتِ آیکنِ lucide (اگر `step` نیست)
 * @param description یک خطِ توضیحِ کوتاه زیرِ عنوان
 * @param action      دکمه/کنترلِ انتهای سرتیتر
 */
export default function SectionCard({
  step,
  icon: Icon,
  title,
  description,
  action,
  children,
  className,
  contentClassName,
  ...props
}) {
  return (
    <Card className={cn("gap-0 py-0", className)} {...props}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 pt-4 pb-3">
        {step != null ? (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground tabular-nums">
            {formatNumber(step)}
          </span>
        ) : (
          Icon && <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold leading-6 text-card-foreground">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
      </header>
      <CardContent className={cn("px-4 pb-4", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
