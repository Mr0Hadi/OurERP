import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { PriceInput } from "@/shared/components/ui/price-input";
import SectionCard from "@/shared/components/forms/SectionCard";
import AmountInWords from "@/shared/components/forms/AmountInWords";
import Notice from "@/shared/components/feedback/Notice";
import InstallmentPlanTermsFields from "./InstallmentPlanTermsFields";
import InstallmentPaymentFields from "./InstallmentPaymentFields";
import InstallmentSchedule from "./InstallmentSchedule";
import InstallmentSummary from "./InstallmentSummary";
import { formatNumber } from "@/shared/lib/numberFormat";
import { cn } from "@/shared/lib/utils";

/**
 * قرارداد اقساطِ فاکتورِ فروشی که هنوز ثبت نشده — شرایط، پیش‌پرداخت (که فاکتور را صادر
 * می‌کند) و پیش‌نمایشِ اقساط. ثبت با دکمه‌ی اصلیِ صفحه است.
 *
 * پیش‌نمایش (`previewInstallmentPlan`) قاعده‌ی سرور را تکرار می‌کند تا مشتری پیش از امضا
 * اقساطش را ببیند؛ عددِ نهایی را سرور از جمعِ واقعیِ فاکتور حساب می‌کند و بعد از ثبت همان
 * نشان داده می‌شود.
 *
 * @param draft    پیش‌نویسِ قرارداد (`EMPTY_PLAN_DRAFT`)
 * @param preview  خروجیِ `previewInstallmentPlan` یا `null`
 * @param errors   `planDraftErrors` (فقط بعد از اولین تلاشِ ثبت)
 * @param taxUnknown جمعِ فاکتور هنوز مالیاتِ کالاهای تازه را ندارد
 * @param blockedReason قرارداد از این‌جا ثبت‌شدنی نیست (دسترسی، محدودیتِ سرور)؛ فقط پیام
 */
export default function InstallmentPlanDraftCard({ draft, onChange, preview, errors = {}, taxUnknown, blockedReason }) {
  const [showSchedule, setShowSchedule] = useState(false);

  if (blockedReason) {
    return (
      <SectionCard title="قرارداد اقساط">
        <Notice tone="warning">{blockedReason}</Notice>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="قرارداد اقساط"
      description="فاکتور با ثبتِ پیش‌پرداخت صادر می‌شود؛ بقیه‌ی مبلغ ماه‌به‌ماه."
    >
      <InstallmentPlanTermsFields value={draft} onChange={onChange} errors={errors} idPrefix="new-plan" />

      <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
        <div className="space-y-1.5">
          <Label htmlFor="new-plan-down" className="text-xs">
            پیش‌پرداخت (ریال)
            <span className="text-destructive"> *</span>
          </Label>
          <PriceInput
            id="new-plan-down"
            min={0}
            value={draft.downPaymentAmount}
            onValueChange={(next) => onChange({ downPaymentAmount: next ?? null })}
            aria-invalid={Boolean(errors.downPaymentAmount)}
            className="h-9 tabular-nums"
          />
          {errors.downPaymentAmount ? (
            <p className="text-xs text-destructive">{errors.downPaymentAmount}</p>
          ) : (
            <AmountInWords rial={draft.downPaymentAmount} />
          )}
        </div>
        <InstallmentPaymentFields value={draft} onChange={onChange} idPrefix="new-plan-down" />
      </div>

      {preview ? (
        <div className="space-y-2">
          <InstallmentSummary
            items={[
              { label: "جمع فاکتور (اصل)", value: preview.cashAmount },
              { label: "سود اقساط", value: preview.installmentChargeAmount },
              { label: "قابل پرداخت", value: preview.totalAmount },
              { label: "مانده پس از پیش‌پرداخت", value: preview.financedAmount },
              {
                label: "هر قسط",
                value: preview.installmentAmount,
                hint:
                  preview.installmentCount > 1 &&
                  preview.financedAmount % preview.installmentCount !== 0
                    ? "باقیمانده‌ی گردکردن روی قسطِ آخر"
                    : undefined,
              },
              { label: "تعداد اقساط", value: preview.installmentCount },
            ]}
          />
          <p className="text-[11px] leading-5 text-muted-foreground">
            پیش‌نمایش است؛ مبالغِ نهایی را سرور هنگامِ ثبت از جمعِ فاکتور حساب می‌کند
            {taxUnknown && " (مالیاتِ کالاهای تازه هنوز در این جمع نیست)"}.
          </p>
          {preview.installments.length > 0 && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full gap-1.5 text-muted-foreground"
                onClick={() => setShowSchedule((shown) => !shown)}
                aria-expanded={showSchedule}
              >
                <ChevronDown className={cn("size-3.5 transition-transform", showSchedule && "rotate-180")} />
                {showSchedule ? "پنهان‌کردنِ جدولِ اقساط" : `جدولِ ${formatNumber(preview.installmentCount)} قسط`}
              </Button>
              {showSchedule && <InstallmentSchedule installments={preview.installments} preview />}
            </>
          )}
        </div>
      ) : (
        <p className="py-1 text-center text-xs text-muted-foreground">
          با واردکردنِ کالاها، درصد سود و تعداد اقساط، پیش‌نمایشِ اقساط اینجا دیده می‌شود.
        </p>
      )}
    </SectionCard>
  );
}
