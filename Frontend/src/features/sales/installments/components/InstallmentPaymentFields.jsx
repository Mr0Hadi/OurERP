import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import PersianDatePicker from "@/shared/components/ui/persian-date-picker";
import StatusChoice from "@/shared/components/forms/StatusChoice";
import { PAYMENT_REFERENCE_FIELDS, PAYMENT_TYPE_LABELS } from "@/shared/domain/enums/paymentType";
import { INSTALLMENT_PAYMENT_TYPES } from "../domain/installmentPlan";

const METHOD_OPTIONS = INSTALLMENT_PAYMENT_TYPES.map((type) => ({ value: type, label: PAYMENT_TYPE_LABELS[type] }));

/**
 * روش، مرجع و تاریخِ یک پرداختِ قرارداد (پیش‌پرداخت، قسط، تسویه). مبلغ اینجا نیست: مبلغِ
 * قسط و تسویه را سرور تعیین می‌کند و پیش‌پرداخت فیلدِ خودش را دارد.
 *
 * @param value `{ paymentType, checkNumber, transferRef, paidAt }`
 * @param onChange `(patch) => void`
 */
export default function InstallmentPaymentFields({ value, onChange, idPrefix = "installment-payment" }) {
  const reference = PAYMENT_REFERENCE_FIELDS[value.paymentType];

  return (
    <div className="@container/payfields space-y-3">
      <StatusChoice
        label="روش پرداخت"
        options={METHOD_OPTIONS}
        value={value.paymentType}
        onChange={(paymentType) => onChange({ paymentType })}
      />
      <div className="grid gap-3 @sm/payfields:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-paidAt`} className="text-xs">
            تاریخ پرداخت
          </Label>
          <PersianDatePicker
            id={`${idPrefix}-paidAt`}
            value={value.paidAt || ""}
            onChange={(isoDate) => onChange({ paidAt: isoDate || "" })}
            placeholder="امروز"
          />
        </div>
        {reference && (
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-reference`} className="text-xs">
              {reference.label}
            </Label>
            <Input
              id={`${idPrefix}-reference`}
              dir="ltr"
              value={value[reference.field] || ""}
              onChange={(e) => onChange({ [reference.field]: e.target.value })}
              className="h-9"
            />
          </div>
        )}
      </div>
    </div>
  );
}
