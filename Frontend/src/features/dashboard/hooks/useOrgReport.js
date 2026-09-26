import { useMemo } from "react";
import { useDashboardReportsQuery } from "../services/queries";
import {
  buildKpis,
  buildPeriodSeries,
  buildRevenueBreakdown,
  describeRange,
} from "../domain/dashboardMetrics";

/**
 * گزارشِ سطحِ سازمان برای ویجت‌های «نمای کل».
 *
 * هر ویجت این هوک را جدا صدا می‌زند؛ React Query درخواست‌های هم‌کلید را
 * یکی می‌کند، پس پنج ویجت یعنی همان دو درخواستِ قبلی — و ویجتِ
 * خاموش‌شده دیگر درخواستی نمی‌زند.
 */
export function useOrgReport(params) {
  const report = useDashboardReportsQuery(params);
  const { salePeriods, purchasePeriods } = report;

  const series = useMemo(
    () => buildPeriodSeries(salePeriods, purchasePeriods, params.periodType),
    [salePeriods, purchasePeriods, params.periodType],
  );
  const kpis = useMemo(
    () => buildKpis(series, params.periodType),
    [series, params.periodType],
  );
  const breakdown = useMemo(() => buildRevenueBreakdown(series), [series]);

  return { ...report, series, kpis, breakdown, rangeLabel: describeRange(series) };
}
