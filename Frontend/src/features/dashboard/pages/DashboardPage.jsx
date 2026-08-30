// src/features/dashboard/pages/DashboardPage.jsx
import { useMemo } from "react";
import { useDashboardFilterStore } from "../store/dashboardFilterStore";
import { useDashboardReportsQuery } from "../services/queries";
import {
  buildKpis,
  buildPeriodSeries,
  buildRevenueBreakdown,
  describeRange,
} from "../domain/dashboardMetrics";
import { PREVIOUS_PERIOD_LABELS } from "@/shared/domain/enums/reportPeriod";
import DashboardToolbar from "../components/DashboardToolbar";
import KpiCard from "../components/KpiCard";
import SalesTrendCard from "../components/SalesTrendCard";
import SalesVsPurchaseCard from "../components/SalesVsPurchaseCard";
import RevenueBreakdownCard from "../components/RevenueBreakdownCard";
import PeriodTableCard from "../components/PeriodTableCard";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import FetchingOverlay from "@/shared/components/feedback/FetchingOverlay";

/**
 * داشبورد روی `api/Report` سوار است (بخش ۱۸ سند api-guide.fa.md) — دو
 * endpoint، هر دو بدونِ صفحه‌بندی و با یک پارامترِ «نوع بازه».
 *
 * صفحه هیچ محاسبه‌ای خودش نمی‌کند: داده‌ی خام از `services` می‌آید و
 * `domain/dashboardMetrics` آن را به سری و شاخص تبدیل می‌کند. دلیلش این
 * است که همین مشتقات بعداً در صفحه‌ی «گزارش‌گیری» هم لازم می‌شوند و
 * نباید در JSX یک صفحه دفن شوند.
 *
 * `min-w-0` روی ریشه و روی هر خانه‌ی گرید اتفاقی نیست: والدِ `<Outlet>`
 * در `AppLayout` یک فلکس‌باکس است و آیتم‌های فلکس/گرید به‌صورت پیش‌فرض
 * زیرِ عرضِ محتوایشان کوچک نمی‌شوند. بدونِ آن، باز کردنِ سایدبار به‌جای
 * تنگ‌کردنِ نمودارها و جدول، کلِ صفحه را افقی اسکرول می‌کرد.
 */
export default function DashboardPage() {
  const {
    periodType,
    fromDate,
    toDate,
    setPeriodType,
    setFromDate,
    setToDate,
    resetFilters,
  } = useDashboardFilterStore();

  const params = useMemo(
    () => ({ periodType, fromDate, toDate }),
    [periodType, fromDate, toDate],
  );

  const {
    salePeriods,
    purchasePeriods,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useDashboardReportsQuery(params);

  const series = useMemo(
    () => buildPeriodSeries(salePeriods, purchasePeriods, periodType),
    [salePeriods, purchasePeriods, periodType],
  );
  const kpis = useMemo(() => buildKpis(series, periodType), [series, periodType]);
  const breakdown = useMemo(() => buildRevenueBreakdown(series), [series]);
  const rangeLabel = describeRange(series);

  return (
    <div className="w-full min-w-0 space-y-4">
      <DashboardToolbar
        periodType={periodType}
        onPeriodTypeChange={setPeriodType}
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        onReset={resetFilters}
      />

      {isError ? (
        <QueryErrorState error={error} onRetry={() => refetch()} />
      ) : (
        // با تغییرِ بازه، داده‌ی قبلی سرِ جایش می‌ماند و فقط محو می‌شود
        // (`keepPreviousData` در هوک)؛ پوششِ fetching همان انتقالِ نرم را
        // نشان می‌دهد بدونِ این‌که چیدمان بپرد.
        <FetchingOverlay active={isFetching && !isLoading}>
          <div className="min-w-0 space-y-3 sm:space-y-4">
            {/* بدونِ این سطر، کارت‌ها گمراه‌کننده‌اند: عددشان مجموعِ کلِ
                بازه است و با عوض‌کردنِ سطحِ گزارش تغییر نمی‌کند (بازه‌ی
                تاریخی همان است)، در حالی که درصدها با همان کلیک عوض
                می‌شوند. یک سطرِ کوچک هر دو را توضیح می‌دهد. */}
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-1 text-xs text-muted-foreground">
              <span>{rangeLabel ? `مجموع ${rangeLabel}` : "مجموع بازه"}</span>
              <span>
                درصدها نسبت به {PREVIOUS_PERIOD_LABELS[periodType] ?? "بازه قبل"}
              </span>
            </div>

            <div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              {kpis.map((kpi) => (
                <div key={kpi.key} className="min-w-0">
                  <KpiCard kpi={kpi} isLoading={isLoading} />
                </div>
              ))}
            </div>

            

            <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-3">
              <div className="min-w-0 xl:col-span-2">
                <SalesVsPurchaseCard series={series} isLoading={isLoading} />
              </div>
              <div className="min-w-0">
                <RevenueBreakdownCard
                  segments={breakdown}
                  isLoading={isLoading}
                />
              </div>
            </div>

            <SalesTrendCard series={series} isLoading={isLoading} />

            <PeriodTableCard series={series} isLoading={isLoading} />
          </div>
        </FetchingOverlay>
      )}
    </div>
  );
}
