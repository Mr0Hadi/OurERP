import { cn } from "@/shared/lib/utils";

/**
 * چند دکمه‌ی کنارِ هم برای انتخابِ یکی از چند گزینه‌ی کوتاه (اندازه‌ی متن،
 * جهتِ کاغذ، …). گزینه‌ها هم‌عرض‌اند و روی لمس دست‌کم ۳۶ پیکسل ارتفاع دارند.
 *
 * @param options `[{ value, label, disabled? }]`
 * @param value   مقدارِ انتخاب‌شده؛ `null` یعنی هیچ‌کدام (مثلاً وقتی عددِ دقیق وارد شده)
 */
export default function SegmentedControl({ value, options, onChange, ariaLabel, disabled = false, className }) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      className={cn("grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-muted p-1", disabled && "opacity-50", className)}
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled || option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "min-h-9 rounded-md px-2 py-1.5 text-xs transition-colors disabled:cursor-not-allowed sm:min-h-8",
              active
                ? "bg-background font-medium text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
