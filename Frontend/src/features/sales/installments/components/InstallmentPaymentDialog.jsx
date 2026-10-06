import { useState } from "react";

import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import Notice from "@/shared/components/feedback/Notice";
import InstallmentPaymentFields from "./InstallmentPaymentFields";
import { InstallmentStatusBadge } from "./InstallmentStatusBadge";
import { usePayInstallmentMutation, useSettleInstallmentPlanMutation } from "../services/mutations";
import { EMPTY_INSTALLMENT_PAYMENT } from "../domain/installmentPlan";
import { gregorianToPersian, todayIso } from "@/shared/lib/dateUtils";
import { formatDigits, formatNumber, formatRial } from "@/shared/lib/numberFormat";

function Row({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-end font-medium tabular-nums">{children}</dd>
    </div>
  );
}

/**
 * بدنه‌ی دیالوگ — جدا تا با هر بازشدن از نو mount شود و فرمِ پرداختِ قبلی نماند.
 *
 * `target`:
 *  - `{ kind: "pay", installment, invoiceNumber?, customerName? }` — `installment` سطرِ
 *    جزئیاتِ قرارداد (`id`) یا فهرستِ اقساط (`installmentId`)؛
 *  - `{ kind: "settle", planId, remainingAmount, remainingCount }` — تسویه‌ی کامل.
 */
function PaymentBody({ target, pay, settle, onClose, onDone }) {
  const [payment, setPayment] = useState(EMPTY_INSTALLMENT_PAYMENT);
  const isSettle = target.kind === "settle";
  const mutation = isSettle ? settle : pay;
  const installment = target.installment;

  const submit = () => {
    const done = (plan) => {
      onDone?.(plan);
      onClose();
    };
    if (isSettle) settle.mutate({ planId: target.planId, payment }, { onSuccess: done });
    else pay.mutate({ installmentId: installment.id ?? installment.installmentId, payment }, { onSuccess: done });
  };

  const amount = isSettle ? target.remainingAmount : installment.amount;

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isSettle ? "تسویه‌ی کاملِ قرارداد" : `دریافتِ قسطِ ${formatDigits(installment.number)}`}
        </DialogTitle>
        <DialogDescription>
          {isSettle
            ? `همه‌ی ${formatNumber(target.remainingCount)} قسطِ باقی‌مانده با یک پرداخت تسویه می‌شود.`
            : "هر قسط یکجا و به مبلغِ کامل پرداخت می‌شود؛ پرداختِ بخشی از قسط ممکن نیست."}
        </DialogDescription>
      </DialogHeader>

      <dl className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-3 text-sm">
        {(target.customerName || target.invoiceNumber) && (
          <Row label="مشتری / فاکتور">
            {[target.customerName, target.invoiceNumber].filter(Boolean).join(" · ")}
          </Row>
        )}
        {!isSettle && (
          <>
            <Row label="سررسید">{gregorianToPersian(installment.dueDate)}</Row>
            <Row label="وضعیت">
              <InstallmentStatusBadge installment={installment} today={todayIso()} size="sm" />
            </Row>
          </>
        )}
        <div className="flex items-baseline justify-between gap-3 border-t border-border pt-1.5">
          <dt className="font-medium">مبلغ دریافت</dt>
          <dd className="text-base font-bold tabular-nums">{formatRial(amount)}</dd>
        </div>
      </dl>

      {isSettle && (
        <Notice tone="info">
          مبلغ دقیقاً ماندهِ قرارداد است؛ برای تسویه‌ی زودهنگام تخفیفی روی سودِ اقساط اعمال نمی‌شود.
        </Notice>
      )}

      <fieldset disabled={mutation.isPending} className="min-w-0">
        <InstallmentPaymentFields
          value={payment}
          onChange={(patch) => setPayment((current) => ({ ...current, ...patch }))}
          idPrefix={isSettle ? "settle" : "pay-installment"}
        />
      </fieldset>

      <DialogFooter className="gap-2">
        <Button type="button" onClick={submit} disabled={mutation.isPending}>
          {mutation.isPending ? "در حال ثبت..." : isSettle ? "ثبتِ تسویه" : "ثبتِ دریافت"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
          انصراف
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * دریافتِ یک قسط یا تسویه‌ی کاملِ قرارداد — همان لحظه روی سرور ثبت می‌شود (نه در پیش‌نویسِ
 * صفحه) و قرارداد، فروش و فهرست‌ها تازه می‌شوند (`applyInstallmentPlan`).
 *
 * @param target  `null` = بسته
 * @param onDone  `(plan) => void` پس از ثبتِ موفق
 */
export default function InstallmentPaymentDialog({ target, onOpenChange, onDone }) {
  // در سطحِ دیالوگ، تا وسطِ ثبت با Esc یا کلیکِ بیرون بسته نشود (مثلِ `ConfirmDialog`).
  const pay = usePayInstallmentMutation();
  const settle = useSettleInstallmentPlanMutation();
  const busy = pay.isPending || settle.isPending;

  return (
    <Dialog
      open={Boolean(target)}
      onOpenChange={(next) => {
        if (!next && busy) return;
        onOpenChange(next);
      }}
    >
      <DialogContent dir="rtl" className="sm:max-w-md" showCloseButton={!busy}>
        {target && (
          <PaymentBody
            pay={pay}
            settle={settle}
            key={target.kind === "settle" ? `settle-${target.planId}` : `pay-${target.installment.id ?? target.installment.installmentId}`}
            target={target}
            onClose={() => onOpenChange(false)}
            onDone={onDone}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
