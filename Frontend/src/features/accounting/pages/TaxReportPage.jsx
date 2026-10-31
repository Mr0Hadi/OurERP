import { Percent } from "lucide-react";

import ChartCard from "@/shared/components/charts/ChartCard";
import GroupedBarChart from "@/shared/components/charts/GroupedBarChart";
import DateRangeToolbar from "@/shared/components/filters/DateRangeToolbar";
import FetchingOverlay from "@/shared/components/feedback/FetchingOverlay";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import RefreshButton from "@/shared/components/table/RefreshButton";
import TableLoadingSkeleton from "@/shared/components/table/TableLoadingSkeleton";
import { TWELVE_MONTH_RANGE_PRESETS } from "@/shared/lib/dateRanges";
import AccountingPageLayout from "../components/AccountingPageLayout";
import SummaryStrip from "../components/SummaryStrip";
import PeriodTypeSelect from "../components/dashboard/PeriodTypeSelect";
import TaxReportTable from "../components/table/TaxReportTable";
import { toChartData } from "../domain/dashboardSeries";
import { useTaxReportQuery } from "../services/queries";
import { useTaxReportStore } from "../store/accountingFilterStores";

const CHART_SERIES = [
  { key: "outputTax", label: "مالیاتِ فروش", color: "var(--chart-1)" },
  { key: "inputTax", label: "مالیاتِ خرید", color: "var(--chart-4)" },
];

function summaryItems(totals) {
  const net = Number(totals?.netTaxPayable) || 0;
  return [
    { key: "sales", label: "فاکتورِ فروش", value: totals?.saleInvoiceCount, format: "count" },
    { key: "output", label: "مالیاتِ فروش", value: totals?.outputTax, hint: "مالیاتِ ذخیره‌شده روی اقلامِ فاکتورهای فروشِ صادرشده." },
    { key: "purchases", label: "فاکتورِ خرید", value: totals?.purchaseInvoiceCount, format: "count" },
    { key: "input", label: "مالیاتِ خرید", value: totals?.inputTax, hint: "مالیاتِ ذخیره‌شده روی اقلامِ فاکتورهای خرید." },
    {
      key: "net",
      label: net < 0 ? "اعتبارِ مالیاتی" : "خالصِ پرداختنی",
      value: Math.abs(net),
      tone: net < 0 ? "info" : "warning",
      emphasis: true,
      hint: "مالیاتِ فروش منهای مالیاتِ خرید. منفی یعنی اعتبارِ مالیاتی.",
    },
    {
      key: "exempt",
      label: "فروشِ معاف",
      value: totals?.exemptSalesNet,
      hint: "خالصِ اقلامِ معاف از مالیات در فاکتورهای فروش.",
    },
  ];
}

/**
 * مالیاتِ ارزش افزوده (`GetTaxReport`) — به تفکیکِ دوره‌ی شمسی، پیش‌فرض فصلی (دوره‌ی
 * اظهارنامه). از مالیاتِ ذخیره‌شده روی هر قلمِ فاکتورِ صادرشده؛ مرجوعی‌ها مالیات را تعدیل
 * نمی‌کنند چون فاکتورِ صادرشده ویرایش نمی‌شود. ریزِ هر فاکتور ستونِ مالیاتِ دفترِ فروش/خرید است.
 */
export default function TaxReportPage() {
  const { periodType, fromDate, toDate, setPeriodType, setRange, resetFilters } = useTaxReportStore();
  const query = useTaxReportQuery({ periodType, fromDate, toDate });
  const { data, isLoading, isFetching, isError, error, refetch } = query;
  const periods = data?.periods ?? [];

  return (
    <AccountingPageLayout
      title="مالیات ارزش افزوده"
      icon={Percent}
      description="مالیاتِ فروش در برابرِ مالیاتِ خرید، به تفکیکِ دوره، از فاکتورهای صادرشده با تاریخِ فاکتور."
      actions={<RefreshButton query={query} />}
    >
      <DateRangeToolbar
        fromDate={fromDate}
        toDate={toDate}
        onRangeChange={setRange}
        onReset={resetFilters}
        presets={TWELVE_MONTH_RANGE_PRESETS}
        emptyLabel="۱۲ ماهِ منتهی به امروز"
        extra={<PeriodTypeSelect value={periodType} onChange={setPeriodType} />}
      />

      {isError && !data ? (
        <QueryErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <>
          <SummaryStrip items={summaryItems(data?.totals)} isLoading={isLoading} caption="جمعِ کلِ بازه" />
          <FetchingOverlay active={isFetching && !isLoading}>
            <div className="space-y-3">
              {periods.length > 1 && (
                <ChartCard title="مالیاتِ فروش و خرید در هر دوره" isLoading={isLoading} height={200}>
                  <GroupedBarChart
                    data={toChartData(periods, periodType, (period) => ({
                      outputTax: Number(period.outputTax) || 0,
                      inputTax: Number(period.inputTax) || 0,
                    }))}
                    series={CHART_SERIES}
                    height={200}
                  />
                </ChartCard>
              )}
              {isLoading ? (
                <TableLoadingSkeleton />
              ) : (
                <TaxReportTable periods={periods} totals={data?.totals} periodType={periodType} />
              )}
            </div>
          </FetchingOverlay>
        </>
      )}
    </AccountingPageLayout>
  );
}
