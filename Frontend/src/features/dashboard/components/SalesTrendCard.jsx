// src/features/dashboard/components/SalesTrendCard.jsx
import ChartCard from "@/shared/components/charts/ChartCard";
import TrendChart from "@/shared/components/charts/TrendChart";

/**
 * روندِ درآمد، بهای تمام‌شده و سودِ خالص.
 *
 * سود به‌صورت خط (نه ناحیه) رسم می‌شود چون کسرِ دو سریِ دیگر است؛ اگر
 * زیرش هم پُر می‌شد، سه ناحیه‌ی هم‌پوشان می‌ماند و خواننده فکر می‌کرد
 * مجموعِ سه‌تا یک کلِ معنادار است.
 */
const SERIES = [
  {
    key: "revenue",
    label: "درآمد",
    color: "var(--chart-1)",
    variant: "area",
  },
  {
    key: "costOfGoodsSold",
    label: "بهای تمام‌شده",
    color: "var(--chart-5)",
    variant: "area",
  },
  {
    key: "netProfit",
    label: "سود خالص",
    color: "var(--chart-3)",
    variant: "line",
  },
];

export default function SalesTrendCard({ series, isLoading }) {
  return (
    <ChartCard
      title="روند درآمد و سود خالص"
      description="بر اساس زمان ارسال فیزیکی کالا محاسبه می‌شود، نه تاریخ فاکتور. برای دیدنِ بهترِ سود، سری‌های بزرگ‌تر را از راهنما خاموش کنید."
      isLoading={isLoading}
      height={260}
    >
      <TrendChart data={series} series={SERIES} height={260} />
    </ChartCard>
  );
}
