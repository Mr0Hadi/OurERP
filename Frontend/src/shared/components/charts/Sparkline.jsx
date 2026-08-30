// src/shared/components/charts/Sparkline.jsx
import {
  areaPath,
  makeBandScale,
  makeValueScale,
  monotonePath,
  niceScale,
} from "./chartUtils";
import { useChartSize } from "./useChartSize";
import { cn } from "@/shared/lib/utils";

/**
 * منحنیِ کوچکِ داخلِ کارتِ KPI — بدون محور، بدون برچسب، بدون تعامل.
 *
 * کارِ آن یک چیز است: نشان دادنِ *شکلِ* تغییرات کنارِ عددِ درصدِ رشد. یک
 * عددِ «۱۲٪+» به‌تنهایی نمی‌گوید رشد پیوسته بوده یا نتیجه‌ی یک جهشِ
 * ناگهانی در آخرین بازه.
 *
 * عرض را از ظرفش می‌گیرد نه از یک عددِ ثابت: کارتِ KPI روی موبایل دو
 * ستونه است (≈۱۶۰px) و روی دسکتاپ چهار ستونه، و یک منحنیِ ۹۶ پیکسلی در
 * هر دو حالت یا لهیده بود یا گم.
 */
export default function Sparkline({
  values = [],
  color = "var(--chart-1)",
  height = 28,
  className,
}) {
  const { ref, width } = useChartSize(96);

  const points =
    values.length < 2
      ? []
      : (() => {
          const scale = niceScale(values, 2);
          const y = makeValueScale({ ...scale, top: 3, bottom: height - 3 });
          const band = makeBandScale({
            count: values.length,
            left: 0,
            right: width,
          });
          return values.map((value, index) => ({
            x: band.center(index),
            y: y(Number(value) || 0),
          }));
        })();

  // شناسه‌ی گرادیان باید در کلِ صفحه یکتا باشد وگرنه چند کارت یک
  // گرادیان را share می‌کنند و رنگشان اشتباه می‌شود.
  const gradientId = `spark-${color.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <div ref={ref} className={cn("w-full min-w-0", className)} style={{ height }}>
      {points.length > 0 && (
        <svg width={width} height={height} className="block overflow-visible">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath(points, height)} fill={`url(#${gradientId})`} />
          <path
            d={monotonePath(points)}
            fill="none"
            stroke={color}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r={2.5}
            fill={color}
          />
        </svg>
      )}
    </div>
  );
}
