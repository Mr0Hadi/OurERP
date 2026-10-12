import ChartCard from "@/shared/components/charts/ChartCard";
import DonutChart from "@/shared/components/charts/DonutChart";
import { PAYMENT_TYPE_LABELS } from "@/shared/domain/enums/paymentType";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

/**
 * دریافت‌های بازه به تفکیکِ روشِ پرداخت (`cash.byType[].in`). صندوق و بانک هنوز حسابِ جدا
 * ندارند، پس «کجا رفت» فقط از روی روش خوانده می‌شود.
 */
export default function CashByTypeCard({ byType = [], isLoading }) {
  const segments = byType
    .filter((row) => Number(row.in) > 0)
    .map((row, index) => ({
      key: String(row.type),
      label: PAYMENT_TYPE_LABELS[row.type] ?? row.type,
      value: Number(row.in) || 0,
      color: COLORS[index % COLORS.length],
    }));

  return (
    <ChartCard
      title="دریافت‌ها بر اساس روش"
      description="پولی که در بازه به ما رسیده، به تفکیکِ روشِ پرداخت. حسابِ صندوق و بانک هنوز جدا نیست."
      isLoading={isLoading}
      height={200}
    >
      {segments.length > 0 ? (
        <DonutChart segments={segments} size={168} centerLabel="کل دریافت" className="py-1" />
      ) : (
        <p className="py-16 text-center text-sm text-muted-foreground">در این بازه دریافتی ثبت نشده است.</p>
      )}
    </ChartCard>
  );
}
