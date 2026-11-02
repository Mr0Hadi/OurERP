
import SectionCard from "@/shared/components/forms/SectionCard";
import { formatRial } from "@/shared/lib/numberFormat";
import { cn } from "@/shared/lib/utils";

/**
 * سقفِ اعتبارِ مشتری در پرونده‌اش (GAP-06): سقف، بدهیِ مؤثر (مانده‌ی دفتر + چک‌های وصول‌نشده) و اعتبارِ مانده. سرور
 * صدورِ فاکتورِ نسیه‌ی فراتر از سقف را رد می‌کند؛ عددها از `GetCustomerDetail` است.
 */
export default function CustomerCreditCard({ customer }) {
  const hasLimit = customer.creditLimit != null;
  const limit = Number(customer.creditLimit) || 0;
  const available = customer.creditAvailable;
  const rows = [
    ["سقفِ اعتبار", !hasLimit ? "بدون سقف" : limit === 0 ? "فقط نقدی" : formatRial(limit)],
    ["بدهیِ مؤثر", formatRial(customer.creditExposure ?? 0)],
    ["چک‌های وصول‌نشده (در بدهی)", formatRial(customer.unclearedCheques ?? 0)],
    ...(hasLimit ? [["اعتبارِ مانده", formatRial(Number(available) || 0)]] : []),
  ];

  return (
    <SectionCard title="سقفِ اعتبار">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 border-b border-border py-1.5 last:border-b-0">
            <dt className="text-muted-foreground">{label}</dt>
            <dd
              className={cn(
                "tabular-nums",
                label === "اعتبارِ مانده" && Number(available) < 0 && "font-semibold text-destructive",
              )}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {hasLimit && Number(available) < 0 && (
        <p className="mt-2 text-xs text-destructive">این مشتری بالای سقف است؛ فقط خریدِ کاملاً نقدی (نقد/کارت) پذیرفته می‌شود.</p>
      )}
    </SectionCard>
  );
}
