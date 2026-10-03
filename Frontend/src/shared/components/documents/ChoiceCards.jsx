import { Check } from "lucide-react";

import { cn } from "@/shared/lib/utils";

/**
 * چند گزینه‌ی کنارِ هم به‌شکلِ کارتِ قابل‌انتخاب (radio) — برای تصمیم‌هایی که
 * شکلِ بقیه‌ی صفحه را عوض می‌کنند (پیش‌فاکتور/فاکتور، روشِ پرداخت). هر گزینه
 * توضیحِ کوتاهِ خودش را دارد تا کاربر بی‌حدس انتخاب کند.
 *
 * `compact`: فقط آیکن و عنوان، برای گزینه‌های زیاد (روش‌های پرداخت).
 *
 * @param options `[{ value, label, description?, icon?, disabled?, disabledReason? }]`
 */
export default function ChoiceCards({ label, options, value, onChange, compact = false, className }) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "grid gap-2",
        compact ? "grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))]" : "sm:grid-cols-2",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={option.disabled}
            title={option.disabled ? option.disabledReason : undefined}
            onClick={() => onChange(option.value)}
            className={cn(
              "group relative flex rounded-lg border text-start transition-colors outline-none",
              "focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50",
              compact ? "items-center gap-2 px-3 py-2" : "items-start gap-3 p-3",
              active
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:border-foreground/25 hover:bg-muted/50",
            )}
          >
            {Icon && (
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-md transition-colors",
                  compact ? "size-7" : "size-9",
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-card-foreground">{option.label}</span>
              {!compact && option.description && (
                <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                  {option.description}
                </span>
              )}
            </span>
            {!compact && (
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                  active ? "border-primary bg-primary text-primary-foreground" : "border-input",
                )}
                aria-hidden
              >
                {active && <Check className="size-3" />}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
