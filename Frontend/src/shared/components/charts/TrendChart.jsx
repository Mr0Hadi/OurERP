// src/shared/components/charts/TrendChart.jsx
import { useState } from "react";
import {
  areaPath,
  axisLabelIndices,
  formatCompact,
  indexAtPosition,
  makeBandScale,
  makeValueScale,
  monotonePath,
  niceScale,
} from "./chartUtils";
import { useChartSize } from "./useChartSize";
import ChartTooltip from "./ChartTooltip";
import ChartLegend from "./ChartLegend";

/**
 * مقیاس و مسیرها.
 *
 * بیرونِ کامپوننت است تا رشته‌ی وابستگی‌ها لازم نشود؛ کامپایلرِ ری‌اکت
 * (که در `vite.config.js` روشن است) خودش نتیجه را نگه می‌دارد.
 *
 * نکته‌ی مهم: مقیاس فقط از سری‌های *روشن* ساخته می‌شود. با خاموش‌کردنِ
 * سریِ بزرگ، سریِ کوچک واقعاً باز می‌شود — همان کاری که کلیدهای راهنما
 * قرار است بکنند.
 */
function buildGeometry(data, visibleSeries, plot) {
  const values = data.flatMap((point) =>
    visibleSeries.map((s) => Number(point.values?.[s.key] ?? 0)),
  );
  const scale = niceScale(values);
  const y = makeValueScale({ ...scale, top: plot.top, bottom: plot.bottom });
  const band = makeBandScale({
    count: data.length,
    left: plot.left,
    right: plot.right,
  });

  const paths = visibleSeries.map((s) => ({
    series: s,
    points: data.map((point, index) => ({
      x: band.center(index),
      y: y(Number(point.values?.[s.key] ?? 0)),
    })),
  }));

  return { scale, y, band, paths, zeroY: y(0) };
}

/**
 * نمودارِ روندِ چندسری (خط/ناحیه) با کراس‌هیر و حبابِ مقدار.
 *
 * محورِ مقدار سمتِ راست است چون رابط راست‌به‌چپ است و چشم از همان‌جا
 * شروع می‌کند؛ ولی محورِ زمان مثل هر نمودارِ آماریِ دیگری از چپ به راست
 * جلو می‌رود — قدیمی‌ترین بازه سمتِ چپ. برگرداندنِ زمان هم بیشتر گیج
 * می‌کند تا کمک.
 *
 * @param data    [{ label, tooltipLabel, values: { [seriesKey]: number } }]
 * @param series  [{ key, label, color, variant: "area" | "line", dashed }]
 */
export default function TrendChart({
  data = [],
  series = [],
  height = 280,
  formatValue = formatCompact,
  emptyMessage = "داده‌ای برای نمایش نیست",
}) {
  const { ref, width } = useChartSize();
  const [hoverIndex, setHoverIndex] = useState(null);
  const [hiddenKeys, setHiddenKeys] = useState(() => new Set());

  const toggleSeries = (key) =>
    setHiddenKeys((current) => {
      const next = new Set(current);
      // آخرین سریِ روشن نباید خاموش شود؛ نمودارِ بی‌سری فقط یک
      // مستطیلِ خالی است و کاربر فکر می‌کند داده‌ای نیست.
      if (next.has(key)) next.delete(key);
      else if (next.size < series.length - 1) next.add(key);
      return next;
    });

  const visibleSeries = series.filter((s) => !hiddenKeys.has(s.key));

  const padding = { top: 16, right: 68, bottom: 28, left: 12 };
  const plot = {
    left: padding.left,
    right: Math.max(padding.left + 1, width - padding.right),
    top: padding.top,
    bottom: height - padding.bottom,
  };

  const geometry = buildGeometry(data, visibleSeries, plot);
  const labelIndices = new Set(axisLabelIndices(data.length, width));

  const selectAt = (clientX, element) => {
    const rect = element.getBoundingClientRect();
    setHoverIndex(
      indexAtPosition(clientX - rect.left, {
        count: data.length,
        left: plot.left,
        right: plot.right,
      }),
    );
  };

  const handleMove = (event) =>
    selectAt(event.clientX, event.currentTarget);

  /**
   * روی موبایل هیچ hoverـی وجود ندارد و بدونِ این، نمودار فقط یک شکلِ
   * بی‌عدد است — کاربر هیچ راهی ندارد بفهمد این ستون چقدر بوده.
   * کشیدنِ انگشت روی نمودار همان کاری را می‌کند که حرکتِ ماوس.
   */
  const handleTouch = (event) => {
    const touch = event.touches[0];
    if (touch) selectAt(touch.clientX, event.currentTarget);
  };

  const hovered = hoverIndex != null ? data[hoverIndex] : null;

  return (
    <div className="space-y-3">
      <ChartLegend series={series} hidden={hiddenKeys} onToggle={toggleSeries} />

      {/* overflow-hidden لازم است: تا وقتی ResizeObserver عرضِ تازه را
          نداده، SVG با عرضِ قبلی رسم می‌شود و بدونِ این، همان یک فریم
          کلِ صفحه را افقی اسکرول می‌کند. */}
      <div
        ref={ref}
        className="relative w-full min-w-0 overflow-hidden"
        style={{ height }}
      >
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <>
            <svg
              width={width}
              height={height}
              onMouseMove={handleMove}
              onMouseLeave={() => setHoverIndex(null)}
              onTouchStart={handleTouch}
              onTouchMove={handleTouch}
              onTouchEnd={() => setHoverIndex(null)}
              // touch-pan-y نه touch-none: کاربر باید بتواند از روی نمودار
              // هم صفحه را عمودی اسکرول کند؛ فقط کشیدنِ افقی برای
              // انتخاب بازه است.
              className="block touch-pan-y select-none"
            >
              <defs>
                {visibleSeries.map((s) => (
                  <linearGradient
                    key={s.key}
                    id={`trend-fill-${s.key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
                    <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
                  </linearGradient>
                ))}
              </defs>

              {/* خطوط راهنما و برچسبِ محورِ مقدار (سمت راست) */}
              {geometry.scale.ticks.map((tick) => (
                <g key={tick}>
                  <line
                    x1={plot.left}
                    x2={plot.right}
                    y1={geometry.y(tick)}
                    y2={geometry.y(tick)}
                    stroke="var(--border)"
                    strokeWidth={1}
                    strokeDasharray={tick === 0 ? undefined : "3 5"}
                    opacity={tick === 0 ? 0.9 : 0.5}
                  />
                  <text
                    x={plot.right + 8}
                    y={geometry.y(tick) + 4}
                    fill="var(--muted-foreground)"
                    fontSize="10"
                    /* صفحه راست‌به‌چپ است، پس «انتهای» متن لبه‌ی چپِ آن
                       است؛ با لنگرِ end متن از این x به سمت راست باز
                       می‌شود و داخل ناحیه‌ی رسم نمی‌ریزد. */
                    direction="rtl"
                    textAnchor="end"
                  >
                    {formatValue(tick)}
                  </text>
                </g>
              ))}

              {/* کراس‌هیر زیر منحنی‌ها می‌نشیند تا خطِ داده را نپوشاند */}
              {hoverIndex != null && (
                <line
                  x1={geometry.band.center(hoverIndex)}
                  x2={geometry.band.center(hoverIndex)}
                  y1={plot.top}
                  y2={plot.bottom}
                  stroke="var(--muted-foreground)"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  opacity={0.6}
                />
              )}

              {geometry.paths.map(({ series: s, points }) => (
                <g key={s.key}>
                  {s.variant !== "line" && (
                    <path
                      d={areaPath(points, geometry.zeroY)}
                      fill={`url(#trend-fill-${s.key})`}
                      stroke="none"
                    />
                  )}
                  <path
                    d={monotonePath(points)}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={2}
                    strokeDasharray={s.dashed ? "6 4" : undefined}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {points.map((point, index) => (
                    <circle
                      key={index}
                      cx={point.x}
                      cy={point.y}
                      r={hoverIndex === index ? 4.5 : 0}
                      fill="var(--card)"
                      stroke={s.color}
                      strokeWidth={2.5}
                    />
                  ))}
                </g>
              ))}

              {/* برچسبِ زمان — یکی‌درمیان وقتی بازه‌ها زیادند */}
              {data.map((point, index) => {
                if (!labelIndices.has(index)) return null;
                return (
                  <text
                    key={index}
                    x={geometry.band.center(index)}
                    y={height - 8}
                    fill="var(--muted-foreground)"
                    fontSize="10"
                    textAnchor="middle"
                  >
                    {point.label}
                  </text>
                );
              })}
            </svg>

            {hovered && (
              <ChartTooltip
                x={(geometry.band.center(hoverIndex) / (width || 1)) * 100}
                title={hovered.tooltipLabel ?? hovered.label}
                rows={visibleSeries.map((s) => ({
                  key: s.key,
                  label: s.label,
                  color: s.color,
                  value: formatValue(hovered.values?.[s.key] ?? 0),
                }))}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
