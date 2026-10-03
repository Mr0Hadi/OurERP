import { cn } from "@/shared/lib/utils";

/**
 * انتخابِ وضعیتِ سند هنگامِ ثبت — چند گزینه‌ی کنارِ هم به‌جای یک Select،
 * چون گزینه‌ها کم‌اند و کاربر باید همه را یک‌جا ببیند. راهنمای گزینه‌ی
 * انتخاب‌شده زیرش می‌آید (یک خط، نه یک پاراگرافِ ثابت برای همه).
 *
 * @param options `[{ value, label, hint }]`
 */
export default function StatusChoice({ label = "وضعیت هنگام ثبت", options, value, onChange, disabled }) {
  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-card-foreground">{label}</p>
      <div
        role="radiogroup"
        aria-label={label}
        className="grid gap-1 rounded-lg border border-border p-1"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
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
              onClick={() => onChange(option.value)}
              className={cn(
                "rounded-md px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
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
