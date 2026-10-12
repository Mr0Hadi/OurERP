import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { formatNumber } from "@/shared/lib/numberFormat";
import { toneSolid } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";
import { AGING_BUCKETS, agingTotal } from "../domain/aging";

/**
 * سنی‌بندی به‌شکلِ یک نوارِ انباشته: پهنای هر تکه سهمِ آن سطل از کل. رنگ با دیرکرد تندتر
 * می‌شود. با هاور هر تکه مبلغش را می‌گوید.
 *
 * @param aging       `AgingDto`
 * @param showLegend  جدولِ کوچکِ سطل‌ها زیرِ نوار (کارتِ داشبورد)؛ در جدول فقط خودِ نوار
 */
export default function AgingBar({ aging, showLegend = false, className }) {
  const total = agingTotal(aging);

  if (total <= 0) {
    return <span className={cn("text-xs text-muted-foreground", className)}>سندِ بازی نیست</span>;
  }

  const parts = AGING_BUCKETS.map((bucket) => ({ ...bucket, value: Number(aging?.[bucket.key]) || 0 }));

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label="سنی‌بندی بدهی">
        {parts
          .filter((part) => part.value > 0)
          .map((part) => (
            <Tooltip key={part.key}>
              <TooltipTrigger asChild>
                <span
                  className={cn("h-full first:rounded-s-full last:rounded-e-full", toneSolid(part.tone))}
                  style={{ width: `${(part.value / total) * 100}%` }}
                />
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                {part.label}: <span className="tabular-nums">{formatNumber(part.value)}</span> ریال
              </TooltipContent>
            </Tooltip>
          ))}
      </div>

      {showLegend && (
        <dl className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-x-4 gap-y-1.5 text-xs">
          {parts.map((part) => (
            <div key={part.key} className="min-w-0">
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <span className={cn("size-2 shrink-0 rounded-full", toneSolid(part.tone))} />
                <span className="truncate">{part.label}</span>
              </dt>
              <dd className={cn("tabular-nums font-medium", part.value === 0 && "text-muted-foreground")}>
                {formatNumber(part.value)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
