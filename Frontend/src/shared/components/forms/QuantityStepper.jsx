import { Minus, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { clampQuantity } from "@/shared/lib/quantityUtils";

/**
 * شمارنده‌ی تعداد با سقف مشخص.
 *
 * کنترل‌شده و بی‌خبر از شکل داده: هر ماژول خودش تصمیم می‌گیرد مقدار از
 * کدام فیلد خوانده شود و با چه شناسه‌ای برگردد — در دریافت خرید
 * (productId/expectedQuantity)، در دریافت مرجوعی (lineId/remainingQuantity).
 *
 * value    - مقدار فعلی
 * max      - سقف مجاز
 * onChange - (nextValue) => void
 * min      - کف (پیش‌فرض صفر)؛ مثلاً ۱ وقتی ردیفِ انتخاب‌شده بی‌تعداد معنا ندارد
 */
export default function QuantityStepper({ value, max, onChange, size = "md", min = 0 }) {
  const current = value || 0;
  const dims = size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const inputWidth = size === "sm" ? "w-12" : "w-14";

  const clamp = (next) => Math.max(min, clampQuantity(next, max));
  const handleStep = (delta) => onChange(clamp(current + delta));

  return (
    <div className="flex items-center justify-center gap-1">
      <Button
        type="button"
        size="icon"
        variant="outline"
        className={`${dims} shrink-0`}
        disabled={current <= min}
        onClick={() => handleStep(-1)}
        aria-label="یکی کمتر"
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <Input
        type="number"
        min={min}
        max={max}
        value={current}
        onChange={(e) => onChange(clamp(e.target.value))}
        aria-label="تعداد"
        className={`${dims.split(" ")[0]} ${inputWidth} text-center text-sm px-1`}
      />
      <Button
        type="button"
        size="icon"
        variant="outline"
        className={`${dims} shrink-0`}
        disabled={current >= max}
        onClick={() => handleStep(1)}
        aria-label="یکی بیشتر"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
