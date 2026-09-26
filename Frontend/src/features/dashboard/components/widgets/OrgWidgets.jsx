import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import FetchingOverlay from "@/shared/components/feedback/FetchingOverlay";
import { Card } from "@/shared/components/ui/card";
import { PREVIOUS_PERIOD_LABELS } from "@/shared/domain/enums/reportPeriod";
import KpiCard from "../KpiCard";
import SalesTrendCard from "../SalesTrendCard";
import SalesVsPurchaseCard from "../SalesVsPurchaseCard";
import RevenueBreakdownCard from "../RevenueBreakdownCard";
import PeriodTableCard from "../PeriodTableCard";
import { useOrgReport } from "../../hooks/useOrgReport";

/**
 * ویجت‌های «نمای کل سازمان» — همان کارت‌های داشبوردِ قبلی، هرکدام
 * جداگانه قابلِ روشن/خاموش.
 *
 * خطا فقط در کارتِ شاخص‌ها نشان داده می‌شود (که اولین و معمولاً روشن
 * است)؛ تکرارِ یک پیامِ خطا در پنج کارت فقط صفحه را قرمز می‌کرد.
 */

function OrgFrame({ report, children, showError = false }) {
  if (report.isError) {
    return showError ? (
      <Card>
        <QueryErrorState error={report.error} onRetry={() => report.refetch()} />
      </Card>
    ) : null;
  }
  return (
    <FetchingOverlay active={report.isFetching && !report.isLoading}>
      {children}
    </FetchingOverlay>
  );
}

export function OrgKpisWidget({ params }) {
  const report = useOrgReport(params);
  return (
    <OrgFrame report={report} showError>
      <div className="min-w-0 space-y-2">
        {/* عددِ کارت‌ها مجموعِ کلِ بازه است ولی درصدها با سطحِ گزارش
            عوض می‌شوند؛ این سطر هر دو را توضیح می‌دهد. */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            نمای کل سازمان{report.rangeLabel ? ` — مجموع ${report.rangeLabel}` : ""}
          </span>
          <span>
            درصدها نسبت به {PREVIOUS_PERIOD_LABELS[params.periodType] ?? "بازه قبل"}
          </span>
        </div>
        <div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {report.kpis.map((kpi) => (
            <div key={kpi.key} className="min-w-0">
              <KpiCard kpi={kpi} isLoading={report.isLoading} />
            </div>
          ))}
        </div>
      </div>
    </OrgFrame>
  );
}

export function OrgSalesVsPurchaseWidget({ params }) {
  const report = useOrgReport(params);
  return (
    <OrgFrame report={report}>
      <SalesVsPurchaseCard series={report.series} isLoading={report.isLoading} />
    </OrgFrame>
  );
}

export function OrgRevenueBreakdownWidget({ params }) {
  const report = useOrgReport(params);
  return (
    <OrgFrame report={report}>
      <RevenueBreakdownCard segments={report.breakdown} isLoading={report.isLoading} />
    </OrgFrame>
  );
}

export function OrgSalesTrendWidget({ params }) {
  const report = useOrgReport(params);
  return (
    <OrgFrame report={report}>
      <SalesTrendCard series={report.series} isLoading={report.isLoading} />
    </OrgFrame>
  );
}

export function OrgPeriodTableWidget({ params }) {
  const report = useOrgReport(params);
  return (
    <OrgFrame report={report}>
      <PeriodTableCard series={report.series} isLoading={report.isLoading} />
    </OrgFrame>
  );
}
