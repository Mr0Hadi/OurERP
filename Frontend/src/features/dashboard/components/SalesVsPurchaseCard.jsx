// src/features/dashboard/components/SalesVsPurchaseCard.jsx
import ChartCard from "@/shared/components/charts/ChartCard";
import GroupedBarChart from "@/shared/components/charts/GroupedBarChart";

/**
 * جریانِ ورودی و خروجی: فاکتورهای فروش در برابر فاکتورهای خرید.
 *
 * هر دو سری بر اساس **تاریخ فاکتور** گروه‌بندی شده‌اند، پس با هم قابلِ
 * مقایسه‌اند — برخلافِ نمودارِ روندِ سود که مبنایش تاریخِ ارسال است.
 */
const SERIES = [
  {
    key: "saleInvoiceAmount",
    label: "فاکتور فروش",
    color: "var(--chart-1)",
  },
  {
    key: "purchaseInvoiceAmount",
    label: "فاکتور خرید",
    color: "var(--chart-4)",
  },
  {
    key: "totalReceivedValue",
    label: "ارزش کالای دریافتی",
    color: "var(--chart-2)",
  },
];

export default function SalesVsPurchaseCard({ series, isLoading }) {
  return (
    <ChartCard
      title="فروش در برابر خرید"
      description="مبلغ فاکتورها بر اساس تاریخ فاکتور است، ولی «ارزش کالای دریافتی» بر اساس تاریخ رسید فیزیکی؛ اختلافشان طبیعی است."
      isLoading={isLoading}
    >
      <GroupedBarChart data={series} series={SERIES} height={240} />
    </ChartCard>
  );
}
