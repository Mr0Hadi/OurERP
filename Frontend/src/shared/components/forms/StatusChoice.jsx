import { cn } from "@/shared/lib/utils";

/**
 * انتخابِ وضعیتِ سند هنگامِ ثبت — چند گزینه‌ی کنارِ هم به‌جای یک Select،
 * چون گزینه‌ها کم‌اند و کاربر باید همه را یک‌جا ببیند. راهنمای گزینه‌ی
 * انتخاب‌شده زیرش می‌آید (یک خط، نه یک پاراگرافِ ثابت برای همه).
 *
 * @param options `[{ value, label, hint }]`
 * @param wrap    گزینه‌های زیاد (مثلِ نماهای یک فهرست): در عرضِ کم یک ردیفِ افقیِ قابلِ اسکرول
 *                می‌شوند به‌جای فشرده‌شدن یا شکستن به چند سطرِ ناهم‌عرض
 */
export default function StatusChoice({ label = "وضعیت هنگام ثبت", options, value, onChange, disabled, wrap = false }) {
  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className="min-w-0 space-y-1.5">
      <p className="text-xs font-medium text-card-foreground">{label}</p>
      {/* کنترلِ قطعه‌ای: ریلِ خاکستری و گزینه‌ی فعال به شکلِ کارتِ برجسته. گزینه‌های زیاد
          (`wrap`) روی موبایل در یک ردیفِ افقیِ قابلِ اسکرول می‌مانند، نه چند سطرِ ناهم‌عرض. */}
      <div
        role="radiogroup"
        aria-label={label}
        className={cn(
          "gap-1 rounded-xl bg-muted p-1",
          wrap ? "flex snap-x overflow-x-auto scrollbar-hide" : "grid",
        )}
        style={wrap ? undefined : { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((option) => {
          const active = option.value === selected.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={(event) => {
                onChange(option.value);
                if (wrap) event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
              }}
              className={cn(
                "flex min-h-9 items-center justify-center truncate rounded-lg px-3 text-sm transition-[background-color,color,box-shadow] disabled:opacity-50 sm:min-h-8 sm:text-xs",
                wrap && "shrink-0 snap-start whitespace-nowrap sm:flex-1",
                active
                  ? "bg-background font-semibold text-primary shadow-sm ring-1 ring-border"
                  : "font-medium text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {selected.hint && <p className="text-xs text-muted-foreground">{selected.hint}</p>}
    </div>
  );
}
