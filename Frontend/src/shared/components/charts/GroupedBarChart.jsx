// src/shared/components/charts/GroupedBarChart.jsx
import { useState } from "react";
import {
  barPath,
  axisLabelIndices,
  formatCompact,
  indexAtPosition,
  makeBandScale,
  makeValueScale,
  niceScale,
} from "./chartUtils";
import { useChartSize } from "./useChartSize";
import ChartTooltip from "./ChartTooltip";
import ChartLegend from "./ChartLegend";

/**
 * مقیاس و پهنای ستون‌ها. مثل `TrendChart` بیرونِ کامپوننت است تا
 * وابستگی‌نویسی لازم نشود؛ کامپایلرِ ری‌اکت نتیجه را نگه می‌دارد.
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

  // ۳۰٪ از پهنای هر باند فاصله می‌ماند تا گروه‌ها به هم نچسبند.
  const groupWidth = band.band * 0.7;
  const barWidth = groupWidth / Math.max(1, visibleSeries.length);

  return { scale, y, band, groupWidth, barWidth, zeroY: y(0) };
}

/**
 * ستون‌های کنارِ هم برای مقایسه‌ی چند سری در هر بازه.
 *
 * چرا ستون و نه خط: مقایسه‌ی «مبلغ فاکتور» با «ارزشِ واقعیِ
 * دریافت‌شده» یک مقایسه‌ی نقطه‌به‌نقطه است، نه یک روندِ پیوسته؛ دو خط
 * روی هم چشم را به دنبالِ شیب می‌فرستد در حالی که سؤالِ واقعی «این ماه
 * چقدر اختلاف داشت» است.
 *
 * مقادیرِ منفی پشتیبانی می‌شوند — ستون از خطِ صفر به پایین کشیده
 * می‌شود، نه از کفِ نمودار.
 *
 * @param series [{ key, label, color }]
 */
export default function GroupedBarChart({
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

              {/* نوارِ روشنِ باندِ زیرِ اشاره‌گر — لنگرِ بصریِ حباب */}
              {hoverIndex != null && (
                <rect
                  x={geometry.band.start(hoverIndex)}
                  y={plot.top}
                  width={geometry.band.band}
                  height={plot.bottom - plot.top}
                  fill="var(--accent)"
                  opacity={0.5}
                />
              )}

              {data.map((point, index) =>
                visibleSeries.map((s, seriesIndex) => {
                  const value = Number(point.values?.[s.key] ?? 0);
                  const top = geometry.y(value);
                  const x =
                    geometry.band.center(index) -
                    geometry.groupWidth / 2 +
                    seriesIndex * geometry.barWidth;
                  return (
                    <path
                      key={`${index}-${s.key}`}
                      d={barPath({
                        x: x + 1,
                        y: Math.min(top, geometry.zeroY),
                        width: Math.max(1, geometry.barWidth - 2),
                        height:
                          value >= 0
                            ? geometry.zeroY - top
                            : -(top - geometry.zeroY),
                      })}
                      fill={s.color}
                      opacity={
                        hoverIndex == null || hoverIndex === index ? 0.9 : 0.35
                      }
                    />
                  );
                }),
              )}

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
