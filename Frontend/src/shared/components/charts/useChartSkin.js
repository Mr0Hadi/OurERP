import { useTheme } from "@/shared/components/theme/themeContext";
import { linearPath, monotonePath } from "./chartUtils";

/**
 * تفاوت‌های «هندسیِ» نمودار بینِ تم‌ها.
 *
 * بیشترِ ظاهرِ نمودار (رنگ، خطوطِ راهنما، انیمیشن) با CSS و `data-chart`
 * در فایلِ تم عوض می‌شود؛ ولی شکلِ مسیرها (گوشه‌ی گردِ ستون، منحنیِ نرم،
 * نشانگرِ نقطه‌ها) در خودِ `d`ِ SVG است و CSS به آن دسترسی ندارد. این هوک
 * همان چند تصمیم را یک‌جا نگه می‌دارد.
 *
 * تمِ کلاسیک شبیهِ MSChartِ Windows Forms است: ستونِ گوشه‌تیز با سایه‌روشنِ
 * استوانه‌ای، خطِ شکسته با نشانگرِ مربعیِ همیشه‌پیدا، ناحیه‌ی رسمِ سفید و
 * پُرکردنِ یکدستِ نیمه‌شفاف به‌جای گرادیان.
 */
const MODERN_SKIN = Object.freeze({
  classic: false,
  barRadius: 4,
  linePath: monotonePath,
  lineCap: "round",
  alwaysShowMarkers: false,
  markerShape: "circle",
  areaOpacity: [0.28, 0.02],
  sparkAreaOpacity: [0.3, 0],
  plotBackground: false,
  barSheen: false,
  donutGap: 0.02,
});

const CLASSIC_SKIN = Object.freeze({
  classic: true,
  barRadius: 0,
  linePath: linearPath,
  lineCap: "square",
  alwaysShowMarkers: true,
  markerShape: "square",
  areaOpacity: [0.35, 0.35],
  sparkAreaOpacity: [0.25, 0.25],
  plotBackground: true,
  barSheen: true,
  donutGap: 0,
});

export function useChartSkin() {
  const { theme } = useTheme();
  return theme === "classic" ? CLASSIC_SKIN : MODERN_SKIN;
}
