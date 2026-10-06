import { HandCoins } from "lucide-react";

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
import {
  INSTALLMENT_STATUS_TONES,
  installmentDisplayStatus,
  isInstallmentUnpaid,
} from "@/shared/domain/enums/saleInstallment";
import { gregorianToPersian, todayIso } from "@/shared/lib/dateUtils";
import { formatDigits, formatNumber } from "@/shared/lib/numberFormat";
import { toneRow } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";

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
 * ردیفِ سررسیدگذشته قرمز است و ردیفِ پرداخت‌شده/ابطال‌شده کم‌رنگ.
 *
 * @param onPay  `(row) => void` — دکمه‌ی «دریافت» روی اقساطِ پرداخت‌نشده؛ بدونِ آن دکمه‌ای نیست
 * @param preview پیش‌نمایشِ پیش از ثبت: بدونِ وضعیت و پرداخت
 */
export default function InstallmentSchedule({ installments = [], onPay, preview = false, emptyText }) {
  const today = todayIso();

  if (installments.length === 0) {
    return (
      <p className="py-3 text-center text-xs text-muted-foreground">
        {emptyText ?? "قسطی برای نمایش نیست."}
      </p>
    );
  }

  const rowTone = (row) => {
    if (preview) return "";
    const status = installmentDisplayStatus(row, today);
    return isInstallmentUnpaid(row.status) ? toneRow(INSTALLMENT_STATUS_TONES[status]) : "text-muted-foreground";
  };
  const canPay = (row) => onPay && !preview && isInstallmentUnpaid(row.status);
  const payButton = (row) => (
    <Button type="button" size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={() => onPay(row)}>
      <HandCoins className="size-3.5" />
      دریافت
    </Button>
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
              {!preview && <TableHead>وضعیت</TableHead>}
              {!preview && <TableHead>پرداخت</TableHead>}
              {onPay && !preview && (
                <TableHead className="w-0">
                  <span className="sr-only">دریافت</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {installments.map((row) => (
              <TableRow key={row.id ?? row.number} className={rowTone(row)}>
                <TableCell className="text-center tabular-nums">{formatDigits(row.number)}</TableCell>
                <TableCell className="tabular-nums">{gregorianToPersian(row.dueDate)}</TableCell>
                <TableCell className="font-medium tabular-nums">{formatNumber(row.amount)}</TableCell>
                {!preview && (
                  <TableCell>
                    <InstallmentStatusBadge installment={row} today={today} />
                  </TableCell>
                )}
                {!preview && <TableCell className="text-xs tabular-nums">{paidText(row)}</TableCell>}
                {onPay && !preview && <TableCell>{canPay(row) && payButton(row)}</TableCell>}
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
                {!preview && <InstallmentStatusBadge installment={row} today={today} size="sm" />}
              </div>
              <p className="text-xs text-muted-foreground tabular-nums">
                سررسید {gregorianToPersian(row.dueDate)}
                {!preview && row.paidAt && ` · پرداخت ${paidText(row)}`}
              </p>
            </div>
            {canPay(row) && payButton(row)}
          </li>
        ))}
      </ol>
    </div>
  );
}
