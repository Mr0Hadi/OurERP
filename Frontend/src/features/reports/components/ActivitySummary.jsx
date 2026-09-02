// src/features/reports/components/ActivitySummary.jsx
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatCompact, formatNumber } from "@/shared/components/charts/chartUtils";

/**
 * سه عددِ خلاصه بالای جدول.
 *
 * ⚠️ همه‌ی این‌ها از **همین صفحه** حساب می‌شوند، نه از کلِ گزارش: سرور
 * جمعِ کل را برنمی‌گرداند و گرفتنِ همه‌ی صفحه‌ها فقط برای یک عدد،
 * درخواستِ سنگینی است. برچسب‌ها هم صراحتاً همین را می‌گویند تا کسی
 * «جمع کل» نخواند.
 */
export default function ActivitySummary({ items, isLoading, countLabel, nameKey }) {
  const totalAmount = items.reduce(
    (sum, row) => sum + (Number(row.totalInvoiceAmount) || 0),
    0,
  );
  const totalCount = items.reduce(
    (sum, row) => sum + (Number(row.salesCount ?? row.purchasesCount) || 0),
    0,
  );
  const top = items[0];

  const cells = [
    { label: "جمع مبلغ (این صفحه)", value: formatCompact(totalAmount), unit: "ریال" },
    { label: `${countLabel} (این صفحه)`, value: formatNumber(totalCount) },
    {
      label: "صدرنشین",
      value: top?.[nameKey] || "—",
      hint: top ? formatCompact(top.totalInvoiceAmount) : null,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cells.map((cell) => (
        <Card key={cell.label} className="gap-2 py-3">
          <CardContent className="space-y-1.5">
            <span className="block truncate text-xs text-muted-foreground">
              {cell.label}
            </span>
            {isLoading ? (
              <Skeleton className="h-6 w-24" />
            ) : (
              <div className="flex items-baseline gap-1">
                <span className="truncate text-lg font-semibold tabular-nums sm:text-xl">
                  {cell.value}
                </span>
                {cell.unit && (
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {cell.unit}
                  </span>
                )}
                {cell.hint && (
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {`${cell.hint} ریال`}
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
