import { formatPeriodLabel, formatPeriodRange } from "@/shared/domain/enums/reportPeriod";

/**
 * `series`ِ داشبورد (یا `periods`ِ گزارشِ مالیات) → داده‌ی نمودارهای مشترک
 * (`{ key, label, tooltipLabel, values }`). سرور مرزِ دوره‌ها را شمسی حساب می‌کند ولی
 * `periodStart` را میلادی می‌دهد؛ برچسبِ شمسی اینجا ساخته می‌شود. `periodEnd` مرزِ باز است
 * و `formatPeriodRange` یک روز عقبش می‌کشد.
 *
 * @param pick `(period) => ({ [seriesKey]: number })`
 */
export function toChartData(periods = [], periodType, pick) {
  return periods.map((period) => ({
    key: String(period.periodStart),
    label: formatPeriodLabel(period.periodStart, periodType),
    tooltipLabel: formatPeriodRange(period.periodStart, period.periodEnd),
    values: pick(period),
  }));
}
