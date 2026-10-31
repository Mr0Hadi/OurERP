import { formatNumber } from "@/shared/lib/numberFormat";
import StatGrid from "@/shared/components/data/StatGrid";

/**
 * جمع‌های بالای فهرستِ چک (`summary`ِ `GetCheckList`، روی کلِ فیلتر): چک‌های در جریانِ دریافتی و پرداختی و آن‌هایی
 * که تاریخشان گذشته.
 */
const pastDueTone = (amount) => (Number(amount) > 0 ? "danger" : undefined);

export default function ChequeSummary({ summary }) {
  if (!summary) return null;
  const items = [
    { label: "دریافتیِ در جریان", value: summary.pendingReceivedAmount, hint: `${formatNumber(summary.pendingReceivedCount)} چک` },
    { label: "پرداختیِ در جریان", value: summary.pendingIssuedAmount, hint: `${formatNumber(summary.pendingIssuedCount)} چک` },
    { label: "دریافتیِ سررسیدگذشته", value: summary.pastDueReceivedAmount, tone: pastDueTone(summary.pastDueReceivedAmount) },
    { label: "پرداختیِ سررسیدگذشته", value: summary.pastDueIssuedAmount, tone: pastDueTone(summary.pastDueIssuedAmount) },
  ];
  return <StatGrid items={items} className="grid-cols-2 md:grid-cols-4" />;
}
