// src/shared/components/charts/DonutChart.jsx
import { useMemo, useState } from "react";
import { donutArcPath, formatCompact, formatPercent } from "./chartUtils";
import { cn } from "@/shared/lib/utils";

const TAU = Math.PI * 2;

/**
 * سهمِ اجزا از یک کل — مثلاً «از هر ریالِ فروش، چقدر بهای تمام‌شده بود
 * و چقدر سود ماند».
 *
 * وسطِ حلقه خالی نمی‌ماند: تا وقتی چیزی هاور نشده، مجموعِ کل را نشان
 * می‌دهد و با هاور روی هر قوس، همان جزء را. این کار جدولِ کنارِ نمودار
 * را حذف می‌کند بدون این‌که چیزی از دست برود.
 *
 * سهم‌های منفی رسم نمی‌شوند: نموداری که «سهمِ منفی از کل» را نشان دهد
 * معنایی ندارد؛ در بازه‌ی زیان‌ده، تفسیرِ درست را کارت سودِ خالص
 * می‌دهد نه این حلقه.
 */
export default function DonutChart({
  segments = [],
  size = 200,
  thickness = 26,
  centerLabel = "مجموع",
  formatValue = formatCompact,
  className,
}) {
  const [hoverKey, setHoverKey] = useState(null);

  const { arcs, total } = useMemo(() => {
    const usable = segments.filter((s) => Number(s.value) > 0);
    const sum = usable.reduce((acc, s) => acc + Number(s.value), 0);
    if (sum <= 0) return { arcs: [], total: 0 };

    let angle = -Math.PI / 2; // شروع از بالا
    const result = usable.map((segment) => {
      const share = Number(segment.value) / sum;
      // فاصله‌ی ریزِ بین قوس‌ها؛ روی سهم‌های خیلی کوچک صفر می‌شود تا
      // قوس کاملاً ناپدید نشود.
      const gap = share > 0.02 ? 0.02 : 0;
      const start = angle;
      const end = angle + share * TAU;
      angle = end;
      return { ...segment, share, startAngle: start + gap / 2, endAngle: end - gap / 2 };
    });

    return { arcs: result, total: sum };
  }, [segments]);

  const active = arcs.find((a) => a.key === hoverKey);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-6", className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        {arcs.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-full border border-dashed border-border text-xs text-muted-foreground">
            داده‌ای نیست
          </div>
        ) : (
          <>
            <svg width={size} height={size}>
              {arcs.map((arc) => {
                const isActive = hoverKey === arc.key;
                return (
                  <path
                    key={arc.key}
                    d={donutArcPath({
                      cx,
                      cy,
                      // قوسِ فعال کمی بیرون می‌زند — به‌جای تغییرِ رنگ که
                      // معنیِ رنگِ سری را مبهم می‌کند.
                      outer: isActive ? size / 2 : size / 2 - 4,
                      inner: size / 2 - thickness,
                      startAngle: arc.startAngle,
                      endAngle: arc.endAngle,
                    })}
                    fill={arc.color}
                    opacity={hoverKey && !isActive ? 0.4 : 1}
                    onMouseEnter={() => setHoverKey(arc.key)}
                    onMouseLeave={() => setHoverKey(null)}
                    className="cursor-default transition-opacity"
                  />
                );
              })}
            </svg>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xs text-muted-foreground">
                {active ? active.label : centerLabel}
              </span>
              <span className="text-lg font-semibold tabular-nums">
                {formatValue(active ? active.value : total)}
              </span>
              {active && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatPercent(active.share * 100)}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      <ul className="min-w-40 space-y-2">
        {segments.map((segment) => {
          const share = total > 0 ? (Number(segment.value) / total) * 100 : 0;
          return (
            <li
              key={segment.key}
              onMouseEnter={() => setHoverKey(segment.key)}
              onMouseLeave={() => setHoverKey(null)}
              className={cn(
                "flex items-center justify-between gap-4 rounded-md px-2 py-1 text-sm transition-colors",
                hoverKey === segment.key && "bg-accent/60",
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="text-muted-foreground">{segment.label}</span>
              </span>
              <span className="flex items-baseline gap-2">
                <span className="font-medium tabular-nums">
                  {formatValue(segment.value)}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {Number(segment.value) > 0 ? formatPercent(share) : "—"}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
