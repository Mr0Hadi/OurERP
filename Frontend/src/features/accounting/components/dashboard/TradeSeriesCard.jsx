import ChartCard from "@/shared/components/charts/ChartCard";
import GroupedBarChart from "@/shared/components/charts/GroupedBarChart";
import { toChartData } from "../../domain/dashboardSeries";

const SERIES = [
  { key: "salesTotal", label: "فروش", color: "var(--chart-1)" },
  { key: "purchasesTotal", label: "خرید", color: "var(--chart-4)" },
];

/** فاکتورهای فروش در برابر خرید در هر دوره (جمعِ فاکتور با مالیات). */
export default function TradeSeriesCard({ series, periodType, isLoading }) {
  const data = toChartData(series, periodType, (period) => ({
    salesTotal: Number(period.salesTotal) || 0,
    purchasesTotal: Number(period.purchasesTotal) || 0,
  }));

  return (
    <ChartCard
      title="فروش و خرید"
      description="جمعِ فاکتورهای صادرشده (با مالیات) بر اساسِ تاریخِ فاکتور. پیش‌فاکتور و لغوشده حساب نمی‌شوند."
      isLoading={isLoading}
    >
      <GroupedBarChart data={data} series={SERIES} height={240} />
    </ChartCard>
  );
}
