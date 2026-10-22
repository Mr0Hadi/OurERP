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
import { Skeleton } from "@/shared/components/ui/skeleton";
import Notice from "@/shared/components/feedback/Notice";
import QueryErrorState from "@/shared/components/feedback/QueryErrorState";
import InstallmentPaymentFields from "./InstallmentPaymentFields";
import { InstallmentStatusBadge } from "./InstallmentStatusBadge";
import { useInstallmentPlanQuery } from "../services/queries";
import { usePayInstallmentMutation, useSettleInstallmentPlanMutation } from "../services/mutations";
import { EMPTY_INSTALLMENT_PAYMENT, installmentPayableToday, unpaidInstallments } from "../domain/installmentPlan";
import { gregorianToPersian } from "@/shared/lib/dateUtils";
import { formatDigits, formatNumber, formatRial } from "@/shared/lib/numberFormat";
import { toneText } from "@/shared/lib/tone";
import { cn } from "@/shared/lib/utils";

function Row({ label, children, className }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3", className)}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-end font-medium tabular-nums">{children}</dd>
    </div>
  );
}

/**
 * ردیف‌های مبلغ: پرداختِ قسط = قسط + جریمه‌ی امروز (`penaltyDue`)؛ تسویه = مانده + جریمه‌ی اقساطِ
 * دیرشده (`penaltyDueAmount`). تخفیفِ تسویه‌ی زودهنگام را سرور هنگامِ ثبت کم می‌کند و پیش از آن
 * عددش در دست نیست (`frontend-requests.fa.md` بند ۲۵.۳)، پس جمعِ تسویه «حداکثر» است.
 */
function amountRows({ isSettle, plan, row }) {
  if (isSettle) {
    const remaining = Number(plan.remainingAmount) || 0;
    const penalty = Number(plan.penaltyDueAmount) || 0;
    return { base: ["مانده‌ی قرارداد", remaining], penalty, total: remaining + penalty };
  }
  const penalty = Number(row.penaltyDue) || 0;
  return { base: ["مبلغ قسط", Number(row.amount) || 0], penalty, days: Number(row.daysLate) || 0, total: installmentPayableToday(row) };
}

/**
 * بدنه‌ی دیالوگ — جدا تا با هر بازشدن از نو mount شود و فرمِ پرداختِ قبلی نماند.
 *
 * `target`:
 *  - `{ kind: "pay", saleId, installment, invoiceNumber?, customerName? }` — `installment` سطرِ
 *    جزئیاتِ قرارداد (`id`) یا فهرستِ اقساط (`installmentId`)؛
 *  - `{ kind: "settle", saleId }` — تسویه‌ی کامل.
 *
 * عددها همیشه از جزئیاتِ قرارداد (`useInstallmentPlanQuery(saleId)`) خوانده می‌شوند: سطرِ فهرستِ
 * اقساط جریمه ندارد، و در کارتِ قرارداد همان کش است و درخواستی نمی‌رود.
 */
function PaymentBody({ target, pay, settle, onClose, onDone }) {
  const [payment, setPayment] = useState(EMPTY_INSTALLMENT_PAYMENT);
  const planQuery = useInstallmentPlanQuery(target.saleId);
  const isSettle = target.kind === "settle";
  const mutation = isSettle ? settle : pay;
  const installmentId = target.installment?.id ?? target.installment?.installmentId;

  const plan = planQuery.data;
  const row = isSettle ? null : (plan?.installments?.find((r) => r.id === installmentId) ?? null);
  const ready = Boolean(plan) && (isSettle || Boolean(row));
  const display = row ?? target.installment;

  const submit = () => {
    const done = (result) => {
      onDone?.(result);
      onClose();
    };
    if (isSettle) settle.mutate({ planId: plan.id, payment }, { onSuccess: done });
    else pay.mutate({ installmentId, payment }, { onSuccess: done });
  };

  const amounts = ready ? amountRows({ isSettle, plan, row }) : null;
  const unpaidCount = plan ? unpaidInstallments(plan.installments).length : 0;

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isSettle ? "تسویه‌ی کاملِ قرارداد" : `دریافتِ قسطِ ${formatDigits(display.number)}`}
        </DialogTitle>
        <DialogDescription>
          {isSettle
            ? `همه‌ی ${formatNumber(unpaidCount)} قسطِ باقی‌مانده با یک پرداخت تسویه می‌شود.`
            : "هر قسط یکجا و به مبلغِ کامل، همراهِ جریمه‌ی دیرکردش، پرداخت می‌شود؛ پرداختِ بخشی از قسط ممکن نیست."}
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
            <Row label="سررسید">{gregorianToPersian(display.dueDate)}</Row>
            <Row label="وضعیت">
              <InstallmentStatusBadge status={display.status} size="sm" />
            </Row>
          </>
        )}
        {!amounts ? (
          planQuery.isError ? null : <Skeleton className="h-12 w-full" />
        ) : (
          <>
            <Row label={amounts.base[0]}>{formatNumber(amounts.base[1])}</Row>
            {amounts.penalty > 0 && (
              <Row label={amounts.days > 0 ? `جریمه‌ی دیرکرد (${formatNumber(amounts.days)} روز)` : "جریمه‌ی دیرکرد"} className={toneText("danger")}>
                {formatNumber(amounts.penalty)}
              </Row>
            )}
            <div className="flex items-baseline justify-between gap-3 border-t border-border pt-1.5">
              <dt className="font-medium">{isSettle ? "حداکثرِ مبلغِ دریافت" : "مبلغ دریافت"}</dt>
              <dd className="text-base font-bold tabular-nums">{formatRial(amounts.total)}</dd>
            </div>
          </>
        )}
      </dl>

      {planQuery.isError && (
        <QueryErrorState error={planQuery.error} onRetry={() => planQuery.refetch()} />
      )}
      {isSettle && ready && (
        <Notice tone="info">
          سودِ اقساطی که هنوز سررسیدشان نرسیده، به اندازه‌ی تنظیمِ «تخفیفِ تسویه‌ی زودهنگام»، هنگامِ ثبت کم می‌شود؛ مبلغِ نهایی بعد از ثبت در قرارداد دیده می‌شود.
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
        <Button type="button" onClick={submit} disabled={mutation.isPending || !ready}>
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
            key={target.kind === "settle" ? `settle-${target.saleId}` : `pay-${target.installment.id ?? target.installment.installmentId}`}
            target={target}
            onClose={() => onOpenChange(false)}
            onDone={onDone}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
