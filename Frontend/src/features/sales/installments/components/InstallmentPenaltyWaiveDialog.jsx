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
import { Label } from "@/shared/components/ui/label";
import { PriceInput } from "@/shared/components/ui/price-input";
import { Textarea } from "@/shared/components/ui/textarea";
import { useWaiveInstallmentPenaltyMutation } from "../services/mutations";
import { grossPenaltyOf, penaltyWaiveErrors } from "../domain/installmentPlan";
import { formatDigits, formatNumber, formatRial } from "@/shared/lib/numberFormat";

function WaiveBody({ installment, mutation, onClose }) {
  const gross = grossPenaltyOf(installment);
  const current = Number(installment.penaltyWaivedAmount) || 0;
  const [draft, setDraft] = useState({
    amount: current > 0 ? current : gross,
    reason: installment.penaltyWaiveReason ?? "",
  });
  const [showErrors, setShowErrors] = useState(false);
  const errors = penaltyWaiveErrors(draft);

  const submit = () => {
    if (Object.keys(errors).length > 0) return setShowErrors(true);
    mutation.mutate(
      { installmentId: installment.id, amount: draft.amount, reason: draft.reason },
      { onSuccess: onClose },
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>بخشودگیِ جریمه‌ی قسطِ {formatDigits(installment.number)}</DialogTitle>
        <DialogDescription>
          مبلغِ بخشوده از جریمه‌ای که هنگامِ پرداخت حساب می‌شود کم می‌شود و جای بخشودگیِ قبلیِ همین قسط را می‌گیرد.
        </DialogDescription>
      </DialogHeader>

      <dl className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-3 text-sm">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-muted-foreground">جریمه‌ی تا امروز ({formatNumber(installment.daysLate)} روز)</dt>
          <dd className="font-medium tabular-nums">{formatRial(gross)}</dd>
        </div>
        {current > 0 && (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">بخشودگیِ فعلی</dt>
            <dd className="font-medium tabular-nums">{formatRial(current)}</dd>
          </div>
        )}
      </dl>

      <fieldset disabled={mutation.isPending} className="min-w-0 space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="waive-amount" className="text-xs">
              مبلغِ بخشودگی (ریال)
            </Label>
            <div className="flex gap-1">
              <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => setDraft((d) => ({ ...d, amount: gross }))}>
                کلِ جریمه
              </Button>
              {current > 0 && (
                <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => setDraft((d) => ({ ...d, amount: 0 }))}>
                  برداشتنِ بخشودگی
                </Button>
              )}
            </div>
          </div>
          <PriceInput
            id="waive-amount"
            min={0}
            value={draft.amount}
            onValueChange={(amount) => setDraft((d) => ({ ...d, amount }))}
            aria-invalid={showErrors && Boolean(errors.amount)}
            className="h-9"
          />
          {showErrors && errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="waive-reason" className="text-xs">
            دلیل
          </Label>
          <Textarea
            id="waive-reason"
            rows={2}
            maxLength={500}
            value={draft.reason}
            onChange={(e) => setDraft((d) => ({ ...d, reason: e.target.value }))}
            aria-invalid={showErrors && Boolean(errors.reason)}
            placeholder="مثلاً مشتریِ قدیمی، تأخیر به دلیلِ ..."
          />
          {showErrors && errors.reason && <p className="text-xs text-destructive">{errors.reason}</p>}
        </div>
      </fieldset>

      <DialogFooter className="gap-2">
        <Button type="button" onClick={submit} disabled={mutation.isPending}>
          {mutation.isPending ? "در حال ثبت..." : draft.amount === 0 ? "برداشتنِ بخشودگی" : "ثبتِ بخشودگی"}
        </Button>
        <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
          انصراف
        </Button>
      </DialogFooter>
    </>
  );
}

/**
 * بخشودگیِ جریمه‌ی دیرکردِ یک قسطِ پرداخت‌نشده (`WaiveSaleInstallmentPenalty`، دسترسیِ
 * `SaleInstallmentPenaltyWaive`). `installment` سطرِ جزئیاتِ قرارداد است (`id`، `penaltyDue`، …).
 *
 * @param installment `null` = بسته
 */
export default function InstallmentPenaltyWaiveDialog({ installment, onOpenChange }) {
  const mutation = useWaiveInstallmentPenaltyMutation();

  return (
    <Dialog
      open={Boolean(installment)}
      onOpenChange={(next) => {
        if (!next && mutation.isPending) return;
        onOpenChange(next);
      }}
    >
      <DialogContent dir="rtl" className="sm:max-w-md" showCloseButton={!mutation.isPending}>
        {installment && (
          <WaiveBody key={installment.id} installment={installment} mutation={mutation} onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
