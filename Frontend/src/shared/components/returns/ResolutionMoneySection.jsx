import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { PriceInput } from "@/shared/components/ui/price-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import MixedPaymentList from "@/shared/components/forms/MixedPaymentList";
import {
  MONEY_DIRECTIONS,
  methodsForDirection,
} from "@/shared/domain/returns/resolutions";
import {
  PaymentTypeEnum,
  PAYMENT_TYPE_LABELS,
  PAYMENT_REFERENCE_FIELDS,
} from "@/shared/domain/enums/paymentType";

const EMPTY_PART = {
  type: PaymentTypeEnum.CASH,
  amount: "",
  checkNumber: "",
  transferRef: "",
};

/**
 * بخش پول یک تصمیم: به کدام سمت، از چه راهی، چقدر.
 *
 * روش‌ها همان‌هایی هستند که فرم ثبت فروش دارد (نقدی / چک / انتقال /
 * نسیه / ترکیبی) به‌علاوه‌ی «اعتبار خرید بعدی» که فقط در جهتِ پرداخت
 * معنا دارد. برای ترکیبی، همان کامپوننتِ مشترکِ صفحه‌ی فروش استفاده
 * می‌شود و مبلغ کل از جمع ردیف‌ها می‌آید.
 *
 * برچسبِ جهت‌ها از side می‌آید («... از مشتری» یا «... از تامین‌کننده»)
 * تا همین کامپوننت هر دو سمت را بدهد.
 */
export default function ResolutionMoneySection({
  money,
  onChange,
  side,
  defaultAmount,
}) {
  const directionOptions = Object.entries(side.money);
  const direction = money?.direction ?? MONEY_DIRECTIONS.NONE;
  const method = money?.method ?? PaymentTypeEnum.CASH;
  const parts = money?.parts ?? [];

  if (direction === MONEY_DIRECTIONS.NONE) {
    return (
      <DirectionSelect
        direction={direction}
        money={money}
        onChange={onChange}
        options={directionOptions}
        defaultAmount={defaultAmount}
      />
    );
  }

  const isMixed = method === PaymentTypeEnum.MIXED;
  const referenceLabel = PAYMENT_REFERENCE_FIELDS[method]?.label;
  const methodOptions = methodsForDirection(direction);

  const patchPart = (idx, field, value) =>
    onChange({
      parts: parts.map((part, i) =>
        i === idx ? { ...part, [field]: value } : part,
      ),
    });

  return (
    <div className="space-y-2">
      <DirectionSelect
        direction={direction}
        money={money}
        onChange={onChange}
        options={directionOptions}
        defaultAmount={defaultAmount}
      />

      <div className="space-y-2 rounded-md border border-border bg-card/60 p-2.5">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">روش</Label>
          {/* روش پرداخت enum عددی است؛ Radix فقط رشته می‌شناسد. */}
          <Select
            value={String(method)}
            onValueChange={(raw) => {
              const nextMethod = Number(raw);
              onChange({
                method: nextMethod,
                reference: "",
                parts:
                  nextMethod === PaymentTypeEnum.MIXED && parts.length === 0
                    ? [{ ...EMPTY_PART, amount: String(defaultAmount ?? "") }]
                    : parts,
              });
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {methodOptions.map((value) => (
                <SelectItem key={value} value={String(value)}>
                  {PAYMENT_TYPE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isMixed ? (
          <MixedPaymentList
            dense
            title="ردیف‌های پرداخت"
            payments={parts}
            onAdd={() => onChange({ parts: [...parts, { ...EMPTY_PART }] })}
            onRemove={(idx) =>
              onChange({ parts: parts.filter((_, i) => i !== idx) })
            }
            onChange={patchPart}
          />
        ) : (
          <>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">
                مبلغ (ریال)
              </Label>
              <PriceInput
                min={0}
                value={money.amount === "" || money.amount == null ? null : Number(money.amount)}
                onValueChange={(next) => onChange({ amount: next ?? "" })}
                placeholder="مبلغ را وارد کنید"
                className="h-8 text-xs"
              />
            </div>

            {referenceLabel && (
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">
                  {referenceLabel}
                </Label>
                <Input
                  dir="ltr"
                  value={money.reference ?? ""}
                  onChange={(e) => onChange({ reference: e.target.value })}
                  placeholder={referenceLabel}
                  className="h-8 text-xs input-rtl-placeholder"
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DirectionSelect({ direction, money, onChange, options, defaultAmount }) {
  return (
    <Select
      value={String(direction)}
      onValueChange={(raw) => {
        // جهت هم enum عددی است — Radix رشته می‌دهد.
        const value = Number(raw);
        // با عوض‌شدن جهت، روشی که برای جهت تازه مجاز نیست باید کنار
        // برود — وگرنه «اعتبار خرید بعدی» روی «دریافت از مشتری» جا
        // می‌ماند و اعتبارسنجی بی‌دلیل شکست می‌خورد.
        const allowed = methodsForDirection(value);
        const method = allowed.includes(money?.method)
          ? money.method
          : PaymentTypeEnum.CASH;
        // با انتخاب یک جهتِ واقعی، مبلغ پیش‌فرض همان ارزشِ این تصمیم
        // است؛ کاربر می‌تواند دستی تغییرش دهد.
        const amount =
          value !== MONEY_DIRECTIONS.NONE && !(Number(money?.amount) > 0)
            ? String(defaultAmount ?? "")
            : money?.amount;
        onChange({ direction: value, method, amount });
      }}
    >
      <SelectTrigger className="h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([value, label]) => (
          <SelectItem key={value} value={String(value)}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
