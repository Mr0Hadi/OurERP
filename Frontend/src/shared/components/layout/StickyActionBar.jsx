import { cn } from "@/shared/lib/utils";

/**
 * نوارِ چسبانِ پایینِ صفحه: خلاصه (چند مورد، جمع، پیامِ خطا) و دکمه‌های اقدام — ثبتِ مرجوعی، ذخیره‌ی تنظیمات،
 * ساختِ پیش‌فاکتور از پیشنهادِ خرید. موبایل: خلاصه بالا، دکمه‌ها زیرش؛ از `sm` در یک ردیف و کارتِ گرد.
 *
 * داخلِ کارتی با `overflow-hidden` (مثلِ `ListPageLayout`) `sticky` کار نمی‌کند؛ بیرونِ آن بگذارید.
 *
 * @param {React.ReactNode} children خلاصه
 * @param {React.ReactNode} actions دکمه‌ها
 * @param {string} [className] مثلاً `-mx-4 sm:mx-0` برای تمام‌عرض شدن در موبایل
 */
export default function StickyActionBar({ children, actions, className }) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-20 border-t border-border bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        "sm:rounded-xl sm:border md:bottom-4 md:shadow-lg",
        className,
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-sm">{children}</div>
        <div className="flex gap-2">{actions}</div>
      </div>
    </div>
  );
}
