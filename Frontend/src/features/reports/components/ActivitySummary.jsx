// src/features/reports/components/ActivitySummary.jsx
import { Crown, FileText, Wallet } from "lucide-react";

import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  formatCompact,
  formatNumber,
  formatPercent,
} from "@/shared/components/charts/chartUtils";
import { cn } from "@/shared/lib/utils";

/**
 * سه عددِ خلاصه بالای فهرست.
 *
 * ⚠️ همه از **همین صفحه** حساب می‌شوند، نه از کلِ گزارش: سرور جمعِ کل
 * را برنمی‌گرداند و گرفتنِ همه‌ی صفحه‌ها فقط برای یک عدد، درخواستِ
 * سنگینی است. برچسبِ «این صفحه» صراحتاً همین را می‌گوید تا کسی آن را
 * «جمع کل» نخواند.
 *
 * روی موبایل سه‌تایی در یک ردیف له می‌شدند و روی دسکتاپ تک‌ستونی
 * بی‌مصرف بود؛ پس دو ستون از `sm` و سه ستون از `lg`، با کارتِ صدرنشین
 * که در حالتِ دوستونه تمامِ عرض را می‌گیرد (نامِ آدم‌ها بلند است).
 *
 * (`xs:` عمداً استفاده نشده — این پروژه در Tailwind v4 چنین
 * breakpointی تعریف نکرده و کلاس‌هایش بی‌اثرند.)
 */
export default function ActivitySummary({ items, isLoading, countLabel, nameKey }) {
  const totalAmount = items.reduce(
    (sum, row) => sum + (Number(row.totalInvoiceAmount) || 0),
    0,
  );
  const totalCount = items.reduce(
    (sum, row) => sum + (Number(row[countLabel.key]) || 0),
    0,
  );
  const top = items[0];
  const topShare =
    top && totalAmount > 0
      ? (Number(top.totalInvoiceAmount) || 0) / totalAmount
      : null;

  const cells = [
    {
      icon: Wallet,
      label: "جمع مبلغ (این صفحه)",
      value: formatCompact(totalAmount),
      suffix: "ریال",
    },
    {
      icon: FileText,
      label: `${countLabel.label} (این صفحه)`,
      value: formatNumber(totalCount),
    },
    {
      icon: Crown,
      label: "صدرنشین",
      value: top?.[nameKey] || "—",
      suffix: topShare != null ? `${formatPercent(topShare * 100)} از این صفحه` : null,
      wide: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {cells.map((cell) => (
        <Card
          key={cell.label}
          className={cn("gap-0 py-3", cell.wide && "sm:col-span-2 lg:col-span-1")}
        >
          <CardContent className="flex items-start gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <cell.icon className="size-4" />
            </span>

            <div className="min-w-0 flex-1">
              <span className="block truncate text-xs text-muted-foreground">
                {cell.label}
              </span>
              {isLoading ? (
                <Skeleton className="mt-1 h-5 w-24" />
              ) : (
                <div className="flex flex-wrap items-baseline gap-x-1.5">
                  <span className="truncate text-base font-semibold tabular-nums sm:text-lg">
                    {cell.value}
                  </span>
                  {cell.suffix && (
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {cell.suffix}
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
