// src/shared/components/charts/ChartLegend.jsx
import { cn } from "@/shared/lib/utils";

/**
 * راهنمای سری‌ها — و در عین حال کلیدِ خاموش/روشن کردنشان.
 *
 * چرا دکمه است نه یک برچسبِ ساده: در نمودارِ فروش، «درآمد» و «بهای
 * تمام‌شده» یک مرتبه‌ی بزرگی دارند و «سود خالص» کسرِ کوچکی از آن‌ها؛
 * تا وقتی هر سه با هم رسم می‌شوند، منحنیِ سود عملاً روی خطِ صفر
 * می‌چسبد. با خاموش کردنِ دو سریِ بزرگ، مقیاس دوباره محاسبه می‌شود و
 * سود خوانا می‌شود.
 *
 * سری‌ای که خاموش است در محاسبه‌ی مقیاس هم شرکت نمی‌کند — این تصمیم در
 * خودِ نمودار گرفته می‌شود، نه اینجا.
 */
export default function ChartLegend({ series, hidden, onToggle, className }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)}>
      {series.map((item) => {
        const isHidden = hidden?.has(item.key);
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onToggle?.(item.key)}
            aria-pressed={!isHidden}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs transition-opacity",
              "hover:bg-accent/60",
              isHidden ? "opacity-40" : "opacity-100",
            )}
          >
            <span
              className={cn("size-2.5 rounded-full", isHidden && "grayscale")}
              style={{ backgroundColor: item.color }}
            />
            <span className={cn(isHidden && "line-through")}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
