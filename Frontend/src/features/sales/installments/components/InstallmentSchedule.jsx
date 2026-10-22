import { BadgePercent, HandCoins } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { InstallmentStatusBadge } from "./InstallmentStatusBadge";
import { PAYMENT_TYPE_LABELS } from "@/shared/domain/enums/paymentType";
import { INSTALLMENT_STATUS_TONES, isInstallmentUnpaid } from "@/shared/domain/enums/saleInstallment";
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import { formatDigits, formatNumber } from "@/shared/lib/numberFormat";
import { toneRow } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";

/**
 * جریمه‌ی دیرکردِ یک سطر: پرداخت‌شده ← آنچه گرفته شد (`penaltyAmount`)؛ پرداخت‌نشده ← آنچه
 * پرداختِ امروز می‌گیرد (`penaltyDue`، بخشودگی کم شده) و چند روز دیر است. `null` = جریمه‌ای نیست.
 */
function penaltyInfo(row) {
  const waived = Number(row.penaltyWaivedAmount) || 0;
  if (isInstallmentUnpaid(row.status)) {
    const due = Number(row.penaltyDue) || 0;
    if (due === 0 && waived === 0) return null;
    return { amount: due, days: Number(row.daysLate) || 0, waived };
  }
  const paid = Number(row.penaltyAmount) || 0;
  return paid > 0 || waived > 0 ? { amount: paid, waived } : null;
}

/** بخشودگی فقط روی سطرِ پرداخت‌نشده‌ای که جریمه دارد (یا بخشودگیِ قبلی‌اش را می‌شود برداشت). */
const canWaive = (row) => isInstallmentUnpaid(row.status) && penaltyInfo(row) != null;

function PenaltyText({ row }) {
  const info = penaltyInfo(row);
  if (!info) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="tabular-nums">
      {formatNumber(info.amount)}
      {info.days > 0 && <span className="text-muted-foreground"> · {formatNumber(info.days)} روز</span>}
      {info.waived > 0 && (
        <span className="block text-[11px] text-muted-foreground" title={row.penaltyWaiveReason || undefined}>
          بخشوده {formatNumber(info.waived)}
        </span>
      )}
    </span>
  );
}

function paidText(row) {
  if (!row.paidAt) return "—";
  const method = row.paymentType != null ? PAYMENT_TYPE_LABELS[row.paymentType] : null;
  return [gregorianToPersian(row.paidAt), method].filter(Boolean).join(" · ");
}

/**
 * جدولِ اقساطِ یک قرارداد — هم برنامه‌ی ثبت‌شده (`GetSaleInstallmentPlanDetail.installments`)
 * و هم پیش‌نمایشِ فرم (بی `id`، بی ستونِ پرداخت). در عرضِ کم (کارت یا موبایل) فهرستِ
 * فشرده است و از عرضِ کارت بیرون نمی‌زند.
 *
 * ردیفِ سررسیدگذشته قرمز است و ردیفِ پرداخت‌شده/ابطال‌شده کم‌رنگ. ستونِ «جریمه» جریمه‌ی دیرکرد
 * است (`penaltyInfo`) و تخفیفِ تسویه‌ی زودهنگامِ هر سطر زیرِ مبلغش می‌آید.
 *
 * @param onPay   `(row) => void` — دکمه‌ی «دریافت» روی اقساطِ پرداخت‌نشده؛ بدونِ آن دکمه‌ای نیست
 * @param onWaive `(row) => void` — دکمه‌ی «بخشودگی» روی اقساطِ پرداخت‌نشده‌ی دارای جریمه
 * @param preview پیش‌نمایشِ پیش از ثبت: بدونِ وضعیت، جریمه و پرداخت
 */
export default function InstallmentSchedule({ installments = [], onPay, onWaive, preview = false, emptyText }) {
  if (installments.length === 0) {
    return (
      <p className="py-3 text-center text-xs text-muted-foreground">
        {emptyText ?? "قسطی برای نمایش نیست."}
      </p>
    );
  }

  const rowTone = (row) => {
    if (preview) return "";
    return isInstallmentUnpaid(row.status) ? toneRow(INSTALLMENT_STATUS_TONES[row.status]) : "text-muted-foreground";
  };
  const hasActions = !preview && (onPay || onWaive);
  const actions = (row) => (
    <div className="flex shrink-0 gap-1">
      {onWaive && canWaive(row) && (
        <Button type="button" size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs" onClick={() => onWaive(row)}>
          <BadgePercent className="size-3.5" />
          بخشودگی
        </Button>
      )}
      {onPay && isInstallmentUnpaid(row.status) && (
        <Button type="button" size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={() => onPay(row)}>
          <HandCoins className="size-3.5" />
          دریافت
        </Button>
      )}
    </div>
  );
  const discount = (row) =>
    Number(row.earlySettlementDiscountAmount) > 0 && (
      <span className="block text-[11px] font-normal text-muted-foreground">
        تخفیفِ تسویه {formatNumber(row.earlySettlementDiscountAmount)}
      </span>
    );

  return (
    <div className="@container/schedule">
      {/* عریض: جدول */}
      <div className="hidden overflow-x-auto rounded-lg border border-border @lg/schedule:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 text-center">#</TableHead>
              <TableHead>سررسید</TableHead>
              <TableHead>مبلغ (ریال)</TableHead>
              {!preview && <TableHead>جریمه</TableHead>}
              {!preview && <TableHead>وضعیت</TableHead>}
              {!preview && <TableHead>پرداخت</TableHead>}
              {hasActions && (
                <TableHead className="w-0">
                  <span className="sr-only">عملیات</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {installments.map((row) => (
              <TableRow key={row.id ?? row.number} className={rowTone(row)}>
                <TableCell className="text-center tabular-nums">{formatDigits(row.number)}</TableCell>
                <TableCell className="tabular-nums">{gregorianToPersian(row.dueDate)}</TableCell>
                <TableCell className="font-medium tabular-nums">
                  {formatNumber(row.amount)}
                  {discount(row)}
                </TableCell>
                {!preview && (
                  <TableCell className="text-xs">
                    <PenaltyText row={row} />
                  </TableCell>
                )}
                {!preview && (
                  <TableCell>
                    <InstallmentStatusBadge status={row.status} />
                  </TableCell>
                )}
                {!preview && <TableCell className="text-xs tabular-nums">{paidText(row)}</TableCell>}
                {hasActions && <TableCell>{actions(row)}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* باریک: فهرست */}
      <ol className="divide-y divide-border rounded-lg border border-border @lg/schedule:hidden">
        {installments.map((row) => (
          <li key={row.id ?? row.number} className={cn("flex items-center gap-3 px-3 py-2.5 text-sm", rowTone(row))}>
            <span className="w-6 shrink-0 text-center text-xs text-muted-foreground tabular-nums">
              {formatDigits(row.number)}
            </span>
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold tabular-nums">{formatNumber(row.amount)}</span>
                {!preview && <InstallmentStatusBadge status={row.status} size="sm" />}
              </div>
              <p className="text-xs text-muted-foreground tabular-nums">
                سررسید {gregorianToPersian(row.dueDate)}
                {!preview && row.paidAt && ` · پرداخت ${paidText(row)}`}
              </p>
              {!preview && penaltyInfo(row) && (
                <p className="text-xs">
                  <span className="text-muted-foreground">جریمه </span>
                  <PenaltyText row={row} />
                </p>
              )}
              {!preview && discount(row)}
            </div>
            {hasActions && actions(row)}
          </li>
        ))}
      </ol>
    </div>
  );
}
