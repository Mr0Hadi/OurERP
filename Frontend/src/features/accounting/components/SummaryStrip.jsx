import { Info } from "lucide-react";

import { Skeleton } from "@/shared/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { formatNumber } from "@/shared/lib/numberFormat";
import { toneText } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";

/**
 * جمع‌های بالای جدول (`summary`ِ سرور) — جمعِ **همه‌ی ردیف‌های فیلتر**، نه فقط صفحه‌ی فعلی؛
 * برچسبِ «جمعِ فیلتر» همین را می‌گوید تا کسی آن را با جمعِ ده ردیفِ دیده‌شده یکی نگیرد.
 *
 * `DataTable` پاورقی ندارد و پاورقیِ زیرِ جدولِ اسکرول‌دار روی موبایل هیچ‌وقت دیده نمی‌شد؛
 * پس جمع‌ها بالای جدول می‌آیند: روی موبایل دو ستون، در عرضِ بیشتر تا شش ستون.
 *
 * @param items `[{ key, label, value, format?: "money" | "count" | "text", tone?, hint?, emphasis? }]`
 */
export default function SummaryStrip({ items, isLoading, caption = "جمعِ همه‌ی ردیف‌های فیلتر" }) {
  return (
    <section aria-label={caption} className="space-y-1.5">
      <p className="px-1 text-[11px] text-muted-foreground">{caption}</p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9.5rem),1fr))] gap-2">
        {items.map((item) => (
          <div
            key={item.key}
            className={cn(
              "min-w-0 rounded-lg border border-border bg-muted/30 px-3 py-2",
              item.emphasis && "border-primary/30 bg-primary/5",
            )}
          >
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <span className="truncate">{item.label}</span>
              {item.hint && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" aria-label={`درباره‌ی ${item.label}`} className="shrink-0 cursor-help">
                      <Info className="size-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-60 text-xs leading-5">{item.hint}</TooltipContent>
                </Tooltip>
              )}
            </div>
            {isLoading ? (
              <Skeleton className="mt-1 h-5 w-20" />
            ) : (
              <p
                className={cn(
                  "mt-0.5 truncate text-sm font-semibold tabular-nums sm:text-base",
                  item.tone && toneText(item.tone),
                )}
              >
                {item.format === "text" ? item.value : formatNumber(item.value)}
                {(item.format ?? "money") === "money" && (
                  <span className="ms-1 text-[10px] font-normal text-muted-foreground">ریال</span>
                )}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
