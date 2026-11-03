import { Minus, Plus } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";

/**
 * تعداد با +/− در یک قابِ یکپارچه — فیلدِ تعدادِ اقلامِ خرید/فروش و شمارشِ انبارگردانی. روی موبایل تایپِ عدد کُند است و
 * +/− کافی است؛ عدد را هم می‌شود مستقیم نوشت. «+» سمتِ راست (شروعِ ردیف در RTL) است، همه‌جا یکسان.
 *
 * کنترل‌شده: `value` همان چیزی است که فراخوان نگه می‌دارد (عدد یا متنِ در حالِ تایپ، یا `""` برای «خالی»).
 * `onChange` با دکمه‌ها عدد و با تایپ متنِ خامِ فیلد را می‌دهد؛ اعتبارسنجی با فراخوان است.
 *
 * @param min  کف (پیش‌فرض ۱ برای قلمِ سند؛ ۰ برای شمارش)
 * @param size `"sm"` (۳۲px، جدول) یا `"md"` (۳۶px، کارتِ موبایل)
 * @param inputProps بقیه به خودِ `Input` می‌رود (`onBlur`، `onKeyDown`، `placeholder`، `aria-label`، `readOnly`)
 */
export default function QuantityField({ value, onChange, min = 1, size = "md", className, ...inputProps }) {
  const empty = value === "" || value == null;
  const current = Number(value) || 0;
  const step = (delta) => onChange(empty && delta > 0 ? Math.max(min, 1) : Math.max(min, current + delta));
  const button = size === "sm" ? "w-7" : "w-9";

  return (
    <div
      className={cn(
        "flex items-stretch overflow-hidden rounded-md border border-input bg-background",
        size === "sm" ? "h-8" : "h-9",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        className={cn("h-full shrink-0 rounded-none p-0", button)}
        onClick={() => step(1)}
        aria-label="یکی بیشتر"
      >
        <Plus className="size-3.5" />
      </Button>
      <Input
        type="number"
        inputMode="numeric"
        min={min}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        aria-label="تعداد"
        {...inputProps}
        className="h-full min-w-0 flex-1 rounded-none border-0 border-x border-input px-0.5 text-center text-sm tabular-nums shadow-none focus-visible:ring-0"
      />
      <Button
        type="button"
        variant="ghost"
        className={cn("h-full shrink-0 rounded-none p-0", button)}
        disabled={empty || current <= min}
        onClick={() => step(-1)}
        aria-label="یکی کمتر"
      >
        <Minus className="size-3.5" />
      </Button>
    </div>
  );
}
