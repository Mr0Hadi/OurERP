import ChartCard from "@/shared/components/charts/ChartCard";
import TrendChart from "@/shared/components/charts/TrendChart";
import { toChartData } from "../../domain/dashboardSeries";

const SERIES = [
  { key: "cashIn", label: "دریافت", color: "var(--chart-2)", variant: "area" },
  { key: "cashOut", label: "پرداخت", color: "var(--chart-5)", variant: "line" },
];

/** پولِ واقعاً جابه‌جاشده در هر دوره — ردیف‌های پرداختِ باطل‌نشده، با تاریخِ پرداخت. */
export default function CashSeriesCard({ series, periodType, isLoading }) {
  const data = toChartData(series, periodType, (period) => ({
    cashIn: Number(period.cashIn) || 0,
    cashOut: Number(period.cashOut) || 0,
  }));

  return (
    <ChartCard
      title="جریان نقدی"
      description="دریافت از مشتریان و بازپرداختِ تامین‌کنندگان در برابرِ پرداخت به تامین‌کنندگان و بازپرداخت به مشتریان، با تاریخِ پرداخت. ردیف‌های باطل‌شده حساب نمی‌شوند."
      isLoading={isLoading}
    >
      <TrendChart data={data} series={SERIES} height={240} />
    </ChartCard>
  );
}
