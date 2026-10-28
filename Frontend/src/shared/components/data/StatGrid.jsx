import { formatNumber } from "@/shared/lib/numberFormat";
import { toneText } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";

/**
 * نوارِ عددها در خانه‌های چسبیده با خطِ جداکننده — جمع‌های بالای فهرستِ چک، عددهای قرارداد
 * اقساط، مانده‌ی صندوق‌ها، پرداختِ یک سند. عددِ خام با `formatNumber` نوشته می‌شود و هر چیزِ
 * دیگر (متن، عددِ علامت‌دار) همان‌طور که داده شده.
 *
 * @param {{ label, value, tone?, hint?, className? }[]} items خانه‌ی `null`/`false` نادیده گرفته می‌شود
 * @param {string} [className] ستون‌ها (`grid-cols-2 md:grid-cols-4`) و چیدمان (`text-center`)
 * @param {"sm"|"md"} [size] `sm` برای کارتِ باریک (برچسب ۱۰px، عدد ۱۲px)
 */
export default function StatGrid({ items, size = "md", className }) {
  const compact = size === "sm";
  return (
    <dl className={cn("grid gap-px overflow-hidden rounded-lg border border-border bg-border", className)}>
      {items.filter(Boolean).map((item) => (
        <div key={item.label} className={cn("min-w-0 bg-card", compact ? "px-1.5 py-1.5" : "px-1.5 py-2 sm:px-2.5")}>
          <dt className={cn("text-muted-foreground", compact ? "text-[10px]" : "text-[11px]")}>{item.label}</dt>
          <dd
            className={cn(
              "font-semibold tabular-nums [overflow-wrap:anywhere]",
              compact ? "text-xs" : "text-[13px] sm:text-sm",
              item.tone && toneText(item.tone),
              item.className,
            )}
          >
            {typeof item.value === "number" ? formatNumber(item.value) : item.value}
          </dd>
          {item.hint && <p className="text-[10px] text-muted-foreground">{item.hint}</p>}
        </div>
      ))}
    </dl>
  );
}
