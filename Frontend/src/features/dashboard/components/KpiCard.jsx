// src/features/dashboard/components/KpiCard.jsx
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { Skeleton } from "@/shared/components/ui/skeleton";
import Sparkline from "@/shared/components/charts/Sparkline";
import {
  formatCompact,
  formatNumber,
  formatPercent,
} from "@/shared/components/charts/chartUtils";
import { cn } from "@/shared/lib/utils";

function formatValue(value, format) {
  if (value == null) return "—";
  if (format === "percent") return formatPercent(value);
  if (format === "count") return formatNumber(value);
  return formatCompact(value);
}

/**
 * یک شاخص: عدد، درصدِ رشد نسبت به بازه‌ی قبل، و شکلِ تغییرات.
 *
 * چیدمان سه سطرِ روی‌هم است نه دو ستون: کارت روی موبایل دو ستونه است
 * (≈۱۶۰px) و عدد و منحنی کنارِ هم آنجا هر دو له می‌شدند. منحنی حالا یک
 * نوارِ تمام‌عرض در کفِ کارت است که در هر عرضی جا می‌شود.
 *
 * هر سطر ارتفاعِ ثابت دارد تا چهار کارتِ یک ردیف هم‌اندازه بمانند —
 * کارت‌هایی مثل «حاشیه سود» که نه واحد دارند و نه نشانِ رشد، وگرنه
 * کوتاه‌تر می‌شوند.
 *
 * رنگِ درصدِ رشد از `direction` می‌آید نه از علامتِ عدد: رشدِ هزینه خبرِ
 * خوبی نیست، ولی اگر فقط علامت را نگاه می‌کردیم همان سبزِ رشدِ سود را
 * می‌گرفت.
 */
export default function KpiCard({ kpi, isLoading }) {
  const {
    label,
    hint,
    value,
    format,
    unit,
    change,
    comparison,
    spark,
    color,
    direction,
  } = kpi;

  const isGood =
    change == null ? null : direction === "down" ? change < 0 : change > 0;
  const ChangeIcon = change > 0 ? ArrowUpRight : ArrowDownRight;

  return (
    <Card className="h-full gap-2 py-3">
      <CardContent className="space-y-1.5">
        <div className="flex h-5 items-center justify-between gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help truncate text-xs text-muted-foreground decoration-dotted underline-offset-4 hover:underline sm:text-sm">
                {label}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-56 text-xs">{hint}</TooltipContent>
          </Tooltip>

          {change != null && !isLoading && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    "flex shrink-0 cursor-help items-center gap-0.5 rounded-md px-1 py-0.5 text-[11px] font-medium tabular-nums",
                    isGood
                      ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                      : "bg-destructive/12 text-destructive",
                  )}
                >
                  <ChangeIcon className="size-3" />
                  {formatPercent(change)}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-56 text-xs">
                تغییر نسبت به {comparison}. بازه‌ی جاری چون هنوز تمام نشده مبنا
                قرار نمی‌گیرد.
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="flex h-7 items-baseline gap-1">
          {isLoading ? (
            <Skeleton className="h-6 w-24" />
          ) : (
            <>
              <span className="truncate text-xl leading-none font-semibold tabular-nums sm:text-2xl">
                {formatValue(value, format)}
              </span>
              {unit && (
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {unit}
                </span>
              )}
            </>
          )}
        </div>

        <Sparkline values={spark} color={color} height={26} />
      </CardContent>
    </Card>
  );
}
