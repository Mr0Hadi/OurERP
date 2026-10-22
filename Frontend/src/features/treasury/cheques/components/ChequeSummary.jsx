import { formatNumber } from "@/shared/lib/numberFormat";
import { toneText } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";

/**
 * جمع‌های بالای فهرستِ چک (`summary`ِ `GetCheckList`، روی کلِ فیلتر): چک‌های در جریانِ دریافتی و پرداختی و آن‌هایی
 * که تاریخشان گذشته.
 */
export default function ChequeSummary({ summary }) {
  if (!summary) return null;
  const items = [
    { label: "دریافتیِ در جریان", value: summary.pendingReceivedAmount, hint: `${formatNumber(summary.pendingReceivedCount)} چک` },
    { label: "پرداختیِ در جریان", value: summary.pendingIssuedAmount, hint: `${formatNumber(summary.pendingIssuedCount)} چک` },
    { label: "دریافتیِ سررسیدگذشته", value: summary.pastDueReceivedAmount, tone: "danger" },
    { label: "پرداختیِ سررسیدگذشته", value: summary.pastDueIssuedAmount, tone: "danger" },
  ];
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="bg-card px-3 py-2">
          <dt className="text-[11px] text-muted-foreground">{item.label}</dt>
          <dd className={cn("text-sm font-semibold tabular-nums", item.tone && Number(item.value) > 0 && toneText(item.tone))}>
            {formatNumber(item.value)}
          </dd>
          {item.hint && <p className="text-[10px] text-muted-foreground">{item.hint}</p>}
        </div>
      ))}
    </dl>
  );
}
