import { Check } from "lucide-react";

import { cn } from "@/shared/lib/utils";

/**
 * انتخابِ *چند* مقدار از چند گزینه‌ی کم — برای پارامترهای فهرستیِ سرور (`statuses`،
 * `entryTypes`، `types`) که ASP.NET به‌شکلِ `?types=1&types=3` می‌خواند.
 *
 * دکمه‌های کنارِ هم به‌جای Select چندتایی: گزینه‌ها کم‌اند و کاربر باید ببیند چه چیزی روشن
 * است. «هیچ‌کدام» یعنی «بدونِ فیلتر» (سرور فهرستِ خالی را همه می‌فهمد)، و همین را
 * `emptyHint` زیرش می‌گوید.
 *
 * @param options `[{ value, label }]`؛ مقدارها عدد
 * @param value   آرایه‌ی مقدارهای انتخاب‌شده
 */
export default function FilterMultiChoice({ label, options, value = [], onChange, emptyHint }) {
  const selected = new Set(value.map(Number));

  const toggle = (optionValue) => {
    const next = new Set(selected);
    if (next.has(optionValue)) next.delete(optionValue);
    else next.add(optionValue);
    // ترتیبِ گزینه‌ها حفظ می‌شود تا کلیدِ کش با ترتیبِ کلیک عوض نشود.
    onChange(options.map((option) => Number(option.value)).filter((v) => next.has(v)));
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {selected.size > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            پاک کردن
          </button>
        )}
      </div>
      <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const optionValue = Number(option.value);
          const active = selected.has(optionValue);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(optionValue)}
              className={cn(
                "flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs transition-colors",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {active && <Check className="size-3" />}
              {option.label}
            </button>
          );
        })}
      </div>
      {selected.size === 0 && emptyHint && <p className="text-xs text-muted-foreground">{emptyHint}</p>}
    </div>
  );
}
