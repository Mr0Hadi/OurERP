import { Link } from "react-router-dom";
import { ChevronLeft, Info } from "lucide-react";

import { Skeleton } from "@/shared/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { formatCompact } from "@/shared/components/charts/chartUtils";
import { formatNumber } from "@/shared/lib/numberFormat";
import { toneSoft, toneText } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";

/**
 * یک کاشیِ داشبوردِ مالی: عددِ فشرده‌ی درشت («۶۲۰ میلیون») برای نگاهِ سریع و عددِ دقیقِ
 * ریالی زیرش برای حسابدار، که عددِ گردشده به کارش نمی‌آید. یکی دو سطرِ فرعی (`sub`) زمینه
 * می‌دهد («۱۲ مشتری · ۳ میلیون سررسیدگذشته»).
 *
 * اگر `to` داشته باشد کلِ کاشی لینکِ دفترِ پشتِ همان عدد است — کاشی و جدولش از یک تعریف
 * می‌آیند (سرور `SummarizeAsync`ِ همان دفتر را صدا می‌زند)، پس کلیک همان عدد را باز می‌کند.
 *
 * @param tone رنگِ آیکن و عدد؛ فقط وقتی عدد خودش هشدار است (معوق)، نه برای تزئین
 */
export default function StatTile({ icon: Icon, label, hint, value, sub, to, tone, isLoading }) {
  const number = Number(value) || 0;

  const body = (
    <>
      <div className="flex items-center gap-2">
        {Icon && (
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-lg border",
              tone ? toneSoft(tone) : "border-border bg-muted text-muted-foreground",
            )}
          >
            <Icon className="size-3.5" />
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground sm:text-sm">{label}</span>
        {hint && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                role="button"
                tabIndex={0}
                aria-label={`درباره‌ی ${label}`}
                className="shrink-0 cursor-help text-muted-foreground hover:text-foreground"
                onClick={(event) => event.preventDefault()}
              >
                <Info className="size-3.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-64 text-xs leading-5">{hint}</TooltipContent>
          </Tooltip>
        )}
        {to && <ChevronLeft className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5" />}
      </div>

      {isLoading ? (
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-3 w-36" />
        </div>
      ) : (
        <div className="min-w-0">
          <p className={cn("truncate text-xl font-semibold leading-tight tabular-nums sm:text-2xl", tone && number !== 0 && toneText(tone))}>
            {formatCompact(number)}
          </p>
          <p className="truncate text-[11px] tabular-nums text-muted-foreground">{formatNumber(number)} ریال</p>
        </div>
      )}

      {sub && !isLoading && <div className="space-y-0.5 text-[11px] leading-4 text-muted-foreground sm:text-xs">{sub}</div>}
    </>
  );

  const className = "group flex h-full min-w-0 flex-col gap-2 rounded-xl border border-border bg-card p-3";

  return to ? (
    <Link to={to} className={cn(className, "transition-colors hover:border-primary/40 hover:bg-muted/40")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
