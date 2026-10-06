import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";
import { INSTALLMENT_COUNT_PRESETS } from "../domain/installmentPlan";
import { formatNumber } from "@/shared/lib/numberFormat";
import { normalizePersianDigits } from "@/shared/lib/persianDigits";
import { cn } from "@/shared/lib/utils";

function Field({ id, label, required, error, hint, children }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        hint && <p className="text-[11px] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

/** فقط رقم و ممیز؛ ارقامِ فارسی هم پذیرفته می‌شوند. */
const decimalInput = (value) =>
  normalizePersianDigits(value)
    .replace(/[٫,]/g, ".")
    .replace(/[^\d.]/g, "");

/**
 * شرایطِ قرارداد اقساطی — درصد سود، تعداد اقساط، سررسیدِ اولین قسط و جریمه‌ی دیرکرد.
 * مشترکِ ثبت (فرمِ فروش) و ویرایش (`UpdateSaleInstallmentPlan`).
 *
 * @param value   `{ markupPercentage, installmentCount, firstDueDate, latePenaltyPercentage }` (رشته)
 * @param onChange `(patch) => void`
 * @param firstDueLabel در ویرایش «سررسیدِ اولین قسطِ پرداخت‌نشده» است
 */
export default function InstallmentPlanTermsFields({
  value,
  onChange,
  errors = {},
  idPrefix = "plan",
  firstDueLabel = "سررسید اولین قسط",
  countHint,
}) {
  return (
    <div className="@container/terms grid gap-3 @md/terms:grid-cols-2">
      <Field id={`${idPrefix}-markup`} label="درصد سود اقساط" required error={errors.markupPercentage}>
        <Input
          id={`${idPrefix}-markup`}
          inputMode="decimal"
          dir="ltr"
          placeholder="0"
          value={value.markupPercentage}
          onChange={(e) => onChange({ markupPercentage: decimalInput(e.target.value) })}
          aria-invalid={Boolean(errors.markupPercentage)}
          className="h-9 tabular-nums"
        />
      </Field>

      <Field id={`${idPrefix}-firstDue`} label={firstDueLabel} required error={errors.firstDueDate}>
        <PersianDatePicker
          id={`${idPrefix}-firstDue`}
          value={value.firstDueDate || ""}
          onChange={(isoDate) => onChange({ firstDueDate: isoDate || "" })}
          placeholder="انتخاب تاریخ"
          error={Boolean(errors.firstDueDate)}
        />
      </Field>

      <Field
        id={`${idPrefix}-count`}
        label="تعداد اقساط (ماهانه)"
        required
        error={errors.installmentCount}
        hint={countHint}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <Input
            id={`${idPrefix}-count`}
            inputMode="numeric"
            dir="ltr"
            value={value.installmentCount}
            onChange={(e) => onChange({ installmentCount: decimalInput(e.target.value).replace(/\./g, "") })}
            aria-invalid={Boolean(errors.installmentCount)}
            className="h-9 w-20 tabular-nums"
          />
          {INSTALLMENT_COUNT_PRESETS.map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => onChange({ installmentCount: String(count) })}
              className={cn(
                "h-7 rounded-md border px-2 text-xs transition-colors",
                String(count) === String(value.installmentCount)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {formatNumber(count)}
            </button>
          ))}
        </div>
      </Field>

      <Field
        id={`${idPrefix}-penalty`}
        label="درصد جریمه‌ی دیرکرد"
        error={errors.latePenaltyPercentage}
        hint="اختیاری؛ فعلاً فقط روی قرارداد ثبت می‌شود و محاسبه‌ای ندارد."
      >
        <Input
          id={`${idPrefix}-penalty`}
          inputMode="decimal"
          dir="ltr"
          value={value.latePenaltyPercentage}
          onChange={(e) => onChange({ latePenaltyPercentage: decimalInput(e.target.value) })}
          aria-invalid={Boolean(errors.latePenaltyPercentage)}
          className="h-9 tabular-nums"
        />
      </Field>
    </div>
  );
}
