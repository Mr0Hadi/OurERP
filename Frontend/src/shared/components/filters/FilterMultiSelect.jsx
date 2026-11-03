import { useId } from "react";
import { ChevronDown, X } from "lucide-react";

import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { formatNumber } from "@/shared/lib/numberFormat";

/**
 * فیلترِ *چندانتخابی* در قالبِ یک فیلدِ بازشونده با چک‌باکس، هم‌قدِ بقیه‌ی فیلدهای `FilterPanel` — برای
 * پارامترهای فهرستیِ سرور (`statuses`، `types`، `entryTypes`) که ASP.NET به‌شکلِ `?types=1&types=3` می‌خواند.
 * هیچ‌کدام = «همه» (سرور فهرستِ خالی را بی‌فیلتر می‌فهمد)؛ معنای دقیقِ «همه» را `allLabel` می‌گوید.
 *
 * @param options `[{ value, label }]`؛ مقدارها عدد
 * @param value   آرایه‌ی مقدارهای انتخاب‌شده
 * @param allLabel متنِ فیلدِ خالی
 */
export default function FilterMultiSelect({ label, options, value = [], onChange, allLabel = "همه" }) {
  const id = useId();
  const selected = new Set(value.map(Number));
  const chosen = options.filter((option) => selected.has(Number(option.value)));

  const toggle = (optionValue) => {
    const next = new Set(selected);
    if (next.has(optionValue)) next.delete(optionValue);
    else next.add(optionValue);
    // ترتیبِ گزینه‌ها حفظ می‌شود تا کلیدِ کش با ترتیبِ کلیک عوض نشود.
    onChange(options.map((option) => Number(option.value)).filter((v) => next.has(v)));
  };

  // یکی یا دو انتخاب با نام، بیشتر با شمار؛ فیلد هم‌عرضِ بقیه می‌ماند.
  const summary =
    chosen.length === 0
      ? allLabel
      : chosen.length <= 2
        ? chosen.map((option) => option.label).join("، ")
        : `${formatNumber(chosen.length)} مورد`;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Label htmlFor={id} className="whitespace-nowrap text-sm font-medium text-foreground">
        {label}
      </Label>
      <Popover>
        <div className="relative min-w-0 flex-1">
          <PopoverTrigger asChild>
            <button
              id={id}
              type="button"
              className="flex h-8 w-full min-w-0 items-center gap-1.5 rounded-lg border border-input bg-transparent pe-2 ps-2.5 text-sm transition-colors outline-none hover:border-ring focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50"
            >
              <span className={`min-w-0 flex-1 truncate text-start ${chosen.length ? "" : "text-muted-foreground"}`}>
                {summary}
              </span>
              {/* جای ضربدر خالی می‌ماند تا متن زیرش نرود. */}
              {chosen.length > 0 && <span className="w-4 shrink-0" />}
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          {chosen.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              aria-label={`پاک کردنِ ${label}`}
              className="absolute end-7 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-44 p-1">
          {options.map((option) => {
            const optionValue = Number(option.value);
            const checked = selected.has(optionValue);
            return (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
              >
                <Checkbox checked={checked} onCheckedChange={() => toggle(optionValue)} />
                {option.label}
              </label>
            );
          })}
        </PopoverContent>
      </Popover>
    </div>
  );
}
