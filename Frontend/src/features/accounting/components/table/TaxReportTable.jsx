import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { formatPeriodLabel, formatPeriodRange } from "@/shared/domain/enums/reportPeriod";
import { formatNumber } from "@/shared/lib/numberFormat";
import { cn } from "@/shared/lib/utils";
import { useIsMobile } from "@/shared/hooks/useIsMobile";
import Amount from "../Amount";

/** خالص: مثبت = بدهیِ مالیاتی، منفی = اعتبارِ مالیاتی. */
function NetTax({ value }) {
  const number = Number(value) || 0;
  return (
    <div className="flex flex-col items-center">
      <Amount value={number} tone={number < 0 ? "info" : number > 0 ? "warning" : undefined} strong />
      {number < 0 && <span className="text-[10px] text-info">اعتبار</span>}
    </div>
  );
}

function Cells({ row }) {
  return (
    <>
      <TableCell className="text-center tabular-nums">{formatNumber(row.saleInvoiceCount)}</TableCell>
      <TableCell className="text-center"><Amount value={row.taxableSalesNet} /></TableCell>
      <TableCell className="text-center"><Amount value={row.exemptSalesNet} /></TableCell>
      <TableCell className="text-center"><Amount value={row.outputTax} strong /></TableCell>
      <TableCell className="border-s text-center tabular-nums">{formatNumber(row.purchaseInvoiceCount)}</TableCell>
      <TableCell className="text-center"><Amount value={row.taxablePurchasesNet} /></TableCell>
      <TableCell className="text-center"><Amount value={row.exemptPurchasesNet} /></TableCell>
      <TableCell className="text-center"><Amount value={row.inputTax} strong /></TableCell>
      <TableCell className="border-s text-center"><NetTax value={row.netTaxPayable} /></TableCell>
    </>
  );
}

function Side({ title, count, taxable, exempt, tax }) {
  return (
    <div className="space-y-1.5 rounded-lg bg-muted/40 p-2.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{title}</span>
        <span className="text-muted-foreground tabular-nums">{formatNumber(count)} فاکتور</span>
      </div>
      <dl className="space-y-1 text-xs">
        <div className="flex justify-between gap-2"><dt className="text-muted-foreground">خالصِ مشمول</dt><dd><Amount value={taxable} /></dd></div>
        <div className="flex justify-between gap-2"><dt className="text-muted-foreground">خالصِ معاف</dt><dd><Amount value={exempt} /></dd></div>
        <div className="flex justify-between gap-2"><dt className="text-muted-foreground">مالیات</dt><dd><Amount value={tax} strong /></dd></div>
      </dl>
    </div>
  );
}

/** کارتِ هر دوره در موبایل — جدولِ ده‌ستونه‌ی دوطبقه روی گوشی خواندنی نیست. */
function PeriodCard({ title, subtitle, row, emphasis }) {
  return (
    <li className={cn("space-y-2.5 rounded-xl border bg-card p-3", emphasis && "border-primary/40 bg-primary/5")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="text-left">
          <p className="text-[11px] text-muted-foreground">خالصِ پرداختنی</p>
          <NetTax value={row.netTaxPayable} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Side title="فروش" count={row.saleInvoiceCount} taxable={row.taxableSalesNet} exempt={row.exemptSalesNet} tax={row.outputTax} />
        <Side title="خرید" count={row.purchaseInvoiceCount} taxable={row.taxablePurchasesNet} exempt={row.exemptPurchasesNet} tax={row.inputTax} />
      </div>
    </li>
  );
}

/**
 * جدولِ مالیاتِ ارزش افزوده به تفکیکِ دوره، با ردیفِ جمع در پاورقی. صفحه‌بندی ندارد (چند
 * دوره بیشتر نیست)، پس از `DataTable` نیست و پاورقیِ واقعی دارد. سرستونِ دوطبقه: فروش
 * (مالیاتِ خروجی) و خرید (مالیاتِ ورودی).
 */
export default function TaxReportTable({ periods, totals, periodType }) {
  const isMobile = useIsMobile();
  if (periods.length === 0) {
    return <p className="py-12 text-center text-sm text-muted-foreground">در این بازه فاکتوری نیست.</p>;
  }

  if (isMobile) {
    return (
      <ul className="space-y-2">
        {totals && <PeriodCard title="جمعِ بازه" row={totals} emphasis />}
        {periods.map((period) => (
          <PeriodCard
            key={String(period.periodStart)}
            title={formatPeriodLabel(period.periodStart, periodType)}
            subtitle={formatPeriodRange(period.periodStart, period.periodEnd)}
            row={period}
          />
        ))}
      </ul>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border custom-scroll">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead rowSpan={2} className="text-center">دوره</TableHead>
            <TableHead colSpan={4} className="text-center">فروش (مالیاتِ خروجی)</TableHead>
            <TableHead colSpan={4} className="border-s text-center">خرید (مالیاتِ ورودی)</TableHead>
            <TableHead rowSpan={2} className="border-s text-center">خالصِ پرداختنی</TableHead>
          </TableRow>
          <TableRow>
            {["فاکتور", "خالصِ مشمول", "خالصِ معاف", "مالیات"].map((label) => (
              <TableHead key={`s-${label}`} className="text-center text-xs">{label}</TableHead>
            ))}
            {["فاکتور", "خالصِ مشمول", "خالصِ معاف", "مالیات"].map((label, index) => (
              <TableHead key={`p-${label}`} className={cn("text-center text-xs", index === 0 && "border-s")}>{label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {periods.map((period) => (
            <TableRow key={String(period.periodStart)}>
              <TableCell className="text-center">
                <div className="flex flex-col items-center">
                  <span className="whitespace-nowrap font-medium">{formatPeriodLabel(period.periodStart, periodType)}</span>
                  <span className="whitespace-nowrap text-[10px] text-muted-foreground">
                    {formatPeriodRange(period.periodStart, period.periodEnd)}
                  </span>
                </div>
              </TableCell>
              <Cells row={period} />
            </TableRow>
          ))}
        </TableBody>
        {totals && (
          <TableFooter>
            <TableRow>
              <TableCell className="text-center font-semibold">جمع</TableCell>
              <Cells row={totals} />
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </div>
  );
}
