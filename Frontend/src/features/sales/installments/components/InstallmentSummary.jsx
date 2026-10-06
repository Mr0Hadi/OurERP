import { formatNumber } from "@/shared/lib/numberFormat";
import { toneText } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";

/**
 * شبکه‌ی عددهای یک قرارداد — هر خانه `{ label, value, tone?, hint? }`. فقط نمایش؛ عددها
 * را سرور (یا پیش‌نمایشِ فرم) می‌دهد. در عرضِ کم دو ستون، در عرضِ بیشتر چهار.
 */
export default function InstallmentSummary({ items }) {
  return (
    <dl className="@container/summary grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border @md/summary:grid-cols-4">
      {items.filter(Boolean).map((item) => (
        <div key={item.label} className="min-w-0 bg-card px-2.5 py-2">
          <dt className="text-[11px] text-muted-foreground">{item.label}</dt>
          <dd
            className={cn(
              "text-[13px] font-semibold tabular-nums [overflow-wrap:anywhere] sm:text-sm",
              item.tone && toneText(item.tone),
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
