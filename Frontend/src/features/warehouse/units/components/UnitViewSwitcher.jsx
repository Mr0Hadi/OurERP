// src/features/warehouse/units/components/UnitViewSwitcher.jsx
import { Button } from "@/shared/components/ui/button";

/**
 * جابه‌جایی بین دو نمای صفحه.
 *
 * عمداً با Button ساخته شده و نه با Tabs رادیکس: این برنامه هیچ‌جای
 * دیگری Tabs استفاده نمی‌کند و رفتار فعال‌سازیِ آن با pointerdown
 * است، در حالی که کل بقیه‌ی برنامه روی همین دکمه‌ها بنا شده. دو حالت
 * هم آن‌قدر کم است که ماشین حالتِ جداگانه نمی‌خواهد.
 */
export default function UnitViewSwitcher({ value, onChange, options }) {
  return (
    <div
      role="group"
      className="inline-flex w-full gap-1 rounded-xl border border-border bg-muted p-1 sm:w-auto"
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <Button
            key={option.value}
            type="button"
            size="lg"
            variant={isActive ? "default" : "ghost"}
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className="flex-1 gap-2 sm:flex-none"
          >
            {option.label}
            {option.count ? (
              <span
                className={`rounded-md px-1.5 py-0.5 text-xs tabular-nums ${
                  isActive
                    ? "bg-primary-foreground/20"
                    : "bg-background text-muted-foreground"
                }`}
              >
                {option.count}
              </span>
            ) : null}
          </Button>
        );
      })}
    </div>
  );
}
