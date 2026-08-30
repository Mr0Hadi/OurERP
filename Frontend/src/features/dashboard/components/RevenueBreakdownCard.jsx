// src/features/dashboard/components/RevenueBreakdownCard.jsx
import ChartCard from "@/shared/components/charts/ChartCard";
import DonutChart from "@/shared/components/charts/DonutChart";

/**
 * ترکیبِ درآمد در کلِ بازه — سهمِ بهای تمام‌شده و سهمِ سود.
 *
 * همان اعدادِ کارت‌های بالای صفحه است، ولی سؤالِ دیگری را جواب می‌دهد:
 * نه «چقدر»، بلکه «از هر ریال، چقدر ماند».
 */
export default function RevenueBreakdownCard({ segments, isLoading }) {
  return (
    <ChartCard
      title="ترکیب درآمد"
      description="سهم بهای تمام‌شده و سود خالص از کل درآمدِ بازه‌ی انتخاب‌شده."
      isLoading={isLoading}
      height={240}
    >
      <DonutChart
        segments={segments}
        size={176}
        centerLabel="کل درآمد"
        className="py-2"
      />
    </ChartCard>
  );
}
