import { CalendarClock } from "lucide-react";

import { Label } from "@/shared/components/ui/label";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";
import SectionCard from "@/shared/components/documents/SectionCard";
import PaymentMethodEditor from "./PaymentMethodEditor";
import { PAYMENT_TYPE_LABELS } from "@/shared/domain/enums/paymentType";
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import { formatRial } from "@/shared/lib/numberFormat";

/**
 * پرداختِ فاکتورِ تازه: روش (نسیه/نقدی/انتقال/چک/ترکیبی)، مبلغ‌ها و —
 * اگر چیزی ماند — سررسیدِ باقیمانده. هیچ‌چیز جدا ذخیره نمی‌شود؛ همراهِ ثبتِ
 * خودِ فاکتور می‌رود.
 *
 * @param settlement   `{ method, rows }`
 * @param payable      مبلغِ قابل پرداخت (جمع فاکتور منهای پیش‌پرداخت‌ها)
 * @param remaining    باقیمانده بعد از همین پرداخت‌ها (برای نمایشِ سررسید)
 * @param prepayments  پرداخت‌های ذخیره‌شده‌ی قبلی (فقط‌خواندنی)
 */
export default function SettlementCard({
  step,
  title,
  description,
  settlement,
  onSettlementChange,
  payable,
  remaining,
  fallbackMethod,
  disabledMethods,
  creditHint,
  dueDate,
  onDueDateChange,
  prepayments = [],
  error,
}) {
  return (
    <SectionCard step={step} title={title} description={description}>
      <div className="space-y-4">
        {prepayments.length > 0 && (
          <div className="rounded-lg border border-border">
            <p className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
              پیش‌پرداخت‌های ثبت‌شده
            </p>
            <ul className="divide-y divide-border text-sm">
              {prepayments.map((payment) => (
                <li key={payment.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="text-muted-foreground">
                    {PAYMENT_TYPE_LABELS[payment.type]}
                    {payment.paidAt && ` · ${gregorianToPersian(payment.paidAt)}`}
                  </span>
                  <span className="font-medium tabular-nums">{formatRial(payment.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <PaymentMethodEditor
          value={settlement}
          onChange={onSettlementChange}
          payable={payable}
          fallbackMethod={fallbackMethod}
          disabledMethods={disabledMethods}
          creditHint={creditHint}
          error={error}
        />

        {onDueDateChange && remaining > 0 && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-dashed border-border px-3 py-2.5">
            <CalendarClock className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <Label htmlFor="settlement-due" className="flex-1 text-xs leading-5">
              سررسیدِ باقیمانده
              <span className="block text-muted-foreground">
                {formatRial(remaining)} بعداً تسویه می‌شود.
              </span>
            </Label>
            <div className="w-full sm:w-44">
              <PersianDatePicker
                id="settlement-due"
                value={dueDate || ""}
                onChange={(isoDate) => onDueDateChange(isoDate || null)}
                placeholder="بدون سررسید"
              />
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
