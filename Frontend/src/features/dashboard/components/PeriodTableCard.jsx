// src/features/dashboard/components/PeriodTableCard.jsx
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import ChartCard from "@/shared/components/charts/ChartCard";
import { Button } from "@/shared/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  formatNumber,
  formatPercent,
} from "@/shared/components/charts/chartUtils";
import { profitMargin } from "../domain/dashboardMetrics";
import { cn } from "@/shared/lib/utils";

/**
 * همان داده‌ی نمودارها، این‌بار با عددِ دقیق.
 *
 * نمودار برای دیدنِ روند است؛ وقتی کسی می‌خواهد رقمِ یک ماه را در
 * گزارشِ دیگری وارد کند به عددِ کامل نیاز دارد، نه «۶۲۰ میلیون» — پس
 * اینجا عمداً از `formatNumber` استفاده می‌شود نه `formatCompact`.
 *
 * ستون‌ها کم‌اند و ردیف‌ها هم بریده: چیزی که می‌ماند، متریک‌هایی است که
 * در هیچ نمودارِ دیگری *عدد*ش پیدا نمی‌شود.
 */
const COLUMNS = [
  { key: "salesCount", label: "تعداد فروش" },
  { key: "revenue", label: "درآمد" },
  { key: "netProfit", label: "سود خالص", emphasize: true },
  { key: "totalReceivedValue", label: "کالای دریافتی" },
];

/**
 * در نمای ماهانه ۱۳ بازه داریم، در نمای روزانه ۳۶۵ تا — و جدولِ ۳۶۵
 * سطری صفحه را چند برابر بلند می‌کند در حالی که کسی سطرِ دویست‌وچهلم را
 * نمی‌خواند. پیش‌فرض چند بازه‌ی آخر است و بقیه پشتِ یک دکمه؛ در حالتِ باز
 * هم جدول داخلِ خودش اسکرول می‌شود، نه صفحه.
 */
const COLLAPSED_ROWS = 6;

const sum = (rows, key) =>
  rows.reduce((acc, row) => acc + (Number(row.values[key]) || 0), 0);

export default function PeriodTableCard({ series, isLoading }) {
  const [expanded, setExpanded] = useState(false);

  // جدیدترین بازه بالا — برعکسِ نمودار، که زمان در آن از چپ جلو می‌رود.
  // کسی که سراغِ جدول می‌آید معمولاً دنبالِ آخرین بازه است.
  const rows = [...series].reverse();
  const canExpand = rows.length > COLLAPSED_ROWS;
  const visibleRows = expanded ? rows : rows.slice(0, COLLAPSED_ROWS);

  return (
    <ChartCard
      title="جزئیات بازه‌ها"
      description="ارقام کامل به ریال. جمع کل همیشه کلِ بازه‌ی انتخاب‌شده است، حتی وقتی چند سطر آخر نمایش داده می‌شود."
      isLoading={isLoading}
      height={200}
      action={
        canExpand && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((value) => !value)}
            className="shrink-0 gap-1 text-xs"
          >
            {expanded ? (
              <>
                <ChevronUp className="size-3.5" />
                نمایش کمتر
              </>
            ) : (
              <>
                <ChevronDown className="size-3.5" />
                نمایش همه ({formatNumber(rows.length)} بازه)
              </>
            )}
          </Button>
        )
      }
    >
      <div
        className={cn(
          "w-full overflow-x-auto",
          expanded && "max-h-96 overflow-y-auto",
        )}
      >
        <Table>
          {/* در حالتِ باز، جدول داخلِ خودش اسکرول می‌شود؛ بدونِ sticky
              بعد از چند سطر دیگر معلوم نیست کدام ستون کدام است. */}
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow>
              <TableHead className="text-right">بازه</TableHead>
              {COLUMNS.map((column) => (
                <TableHead
                  key={column.key}
                  className="whitespace-nowrap text-right"
                >
                  {column.label}
                </TableHead>
              ))}
              <TableHead className="text-right">حاشیه</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {visibleRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={COLUMNS.length + 2}
                  className="h-24 text-center text-muted-foreground"
                >
                  در این بازه گزارشی ثبت نشده است.
                </TableCell>
              </TableRow>
            ) : (
              visibleRows.map((row) => {
                const margin = profitMargin(
                  row.values.netProfit,
                  row.values.revenue,
                );
                return (
                  <TableRow key={row.key}>
                    <TableCell className="whitespace-nowrap font-medium">
                      {row.label}
                      {row.isOpen && (
                        <span className="me-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                          جاری
                        </span>
                      )}
                    </TableCell>

                    {COLUMNS.map((column) => {
                      const value = Number(row.values[column.key]) || 0;
                      return (
                        <TableCell
                          key={column.key}
                          className={cn(
                            "whitespace-nowrap tabular-nums",
                            column.emphasize && "font-medium",
                            column.emphasize && value < 0 && "text-destructive",
                          )}
                        >
                          {formatNumber(value)}
                        </TableCell>
                      );
                    })}

                    <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                      {margin == null ? "—" : formatPercent(margin)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>

          {rows.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell className="font-medium">جمع کل</TableCell>
                {COLUMNS.map((column) => (
                  <TableCell
                    key={column.key}
                    className="whitespace-nowrap font-medium tabular-nums"
                  >
                    {formatNumber(sum(series, column.key))}
                  </TableCell>
                ))}
                <TableCell className="whitespace-nowrap font-medium tabular-nums">
                  {formatPercent(
                    profitMargin(
                      sum(series, "netProfit"),
                      sum(series, "revenue"),
                    ) ?? 0,
                  )}
                </TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </ChartCard>
  );
}
