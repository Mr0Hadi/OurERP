import { Minus, Plus } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";

/**
 * عددِ صحیحِ یک تنظیم با دکمه‌های −/+ (هدفِ لمسیِ بزرگ در موبایل) و واحد کنارِ آن.
 * مقدار رشته است تا ورودیِ نیمه‌کاره («» یا «-») خطا نشان دهد نه این‌که پاک شود؛ −/+ روی
 * ورودیِ نامعتبر از `fallback` (پیش‌فرض) شروع می‌کند.
 */
export default function SettingNumberInput({ id, value, fallback, min, max, unit, disabled, invalid, onChange }) {
  const parsed = /^-?\d+$/.test(value) ? Number(value) : null;
  const current = parsed ?? Number(fallback ?? 0);
  const step = (delta) => {
    let next = (parsed == null ? current : current + delta);
    if (min != null) next = Math.max(min, next);
    if (max != null) next = Math.min(max, next);
    onChange(String(next));
  };

  return (
    <div className="flex items-center gap-2">
      <div
        dir="ltr"
        className={cn(
          "flex h-10 items-center rounded-lg border bg-background md:h-9",
          invalid && "border-destructive",
          disabled && "opacity-60",
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-full w-10 rounded-e-none md:w-9"
          disabled={disabled || (min != null && current <= min)}
          onClick={() => step(-1)}
          aria-label="یکی کمتر"
        >
          <Minus className="size-4" />
        </Button>
        <Input
          id={id}
          inputMode="numeric"
          className="h-full w-20 rounded-none border-0 border-x text-center tabular-nums shadow-none focus-visible:ring-0"
          value={value}
          disabled={disabled}
          aria-invalid={invalid}
          onChange={(e) => onChange(e.target.value.trim())}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-full w-10 rounded-s-none md:w-9"
          disabled={disabled || (max != null && current >= max)}
          onClick={() => step(1)}
          aria-label="یکی بیشتر"
        >
          <Plus className="size-4" />
        </Button>
      </div>
      {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
    </div>
  );
}
