import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
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
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  REFERENCE_LABELS,
} from "@/shared/domain/returns/effects";

const EMPTY_PART = { type: "cash", amount: "", checkNumber: "", transferRef: "" };

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
  const method = money?.method ?? PAYMENT_METHODS.CASH;
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

  const isMixed = method === PAYMENT_METHODS.MIXED;
  const referenceLabel = REFERENCE_LABELS[method];
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
          <Select
            value={method}
            onValueChange={(value) =>
              onChange({
                method: value,
                reference: "",
                parts:
                  value === PAYMENT_METHODS.MIXED && parts.length === 0
                    ? [{ ...EMPTY_PART }]
                    : parts,
              })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {methodOptions.map((value) => (
                <SelectItem key={value} value={value}>
                  {PAYMENT_METHOD_LABELS[value]}
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
              <Input
                type="number"
                dir="ltr"
                min={0}
                value={money.amount ?? ""}
                onChange={(e) => onChange({ amount: e.target.value })}
                placeholder="مبلغ را وارد کنید"
                className="h-8 text-xs input-rtl-placeholder"
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
      value={direction}
      onValueChange={(value) => {
        // با عوض‌شدن جهت، روشی که برای جهت تازه مجاز نیست باید کنار
        // برود — وگرنه «اعتبار خرید بعدی» روی «دریافت از مشتری» جا
        // می‌ماند و اعتبارسنجی بی‌دلیل شکست می‌خورد.
        const allowed = methodsForDirection(value);
        const method = allowed.includes(money?.method)
          ? money.method
          : PAYMENT_METHODS.CASH;
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
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
