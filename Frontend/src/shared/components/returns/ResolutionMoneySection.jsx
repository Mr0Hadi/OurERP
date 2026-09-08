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
  emptyMoneyEffect,
} from "@/shared/domain/returns/resolutions";
import {
  PaymentTypeEnum,
  PAYMENT_TYPE_LABELS,
  PAYMENT_REFERENCE_FIELDS,
} from "@/shared/domain/enums/paymentType";

const EMPTY_PART = {
  method: PaymentTypeEnum.CASH,
  amount: "",
  checkNumber: "",
  transferRef: "",
};

/**
 * بخش پول یک تصمیم: به کدام سمت، از چه راهی، چقدر.
 *
 * ترکیبِ داخلی دو اسلاتِ مستقل دارد — `moneyIn`/`moneyOut`، دقیقاً
 * هم‌شکلِ `EffectCompositionDto`ی بک‌اند — نه یک `money` تکی با فیلدِ
 * جهت. این کامپوننت فقط UI را ساده می‌کند: کاربر یک جهت انتخاب
 * می‌کند و همان یک اسلات پر می‌شود؛ جهت خودش ذخیره نمی‌شود، از روی
 * این‌که کدام اسلات `enabled` است مشتق می‌شود (`moneyIn`/`moneyOut`
 * هرگز هم‌زمان فعال نیستند).
 *
 * روش‌ها همان‌هایی هستند که فرم ثبت فروش دارد (نقدی / چک / انتقال /
 * نسیه / ترکیبی) به‌علاوه‌ی «اعتبار خرید بعدی» که فقط در جهتِ پرداخت
 * معنا دارد.
 *
 * برچسبِ جهت‌ها از side می‌آید («... از مشتری» یا «... از تامین‌کننده»)
 * تا همین کامپوننت هر دو سمت را بدهد.
 */
export default function ResolutionMoneySection({
  moneyIn,
  moneyOut,
  onChange,
  side,
  defaultAmount,
}) {
  const direction = moneyIn?.enabled
    ? MONEY_DIRECTIONS.RECEIVE
    : moneyOut?.enabled
      ? MONEY_DIRECTIONS.PAY
      : MONEY_DIRECTIONS.NONE;
  const active =
    direction === MONEY_DIRECTIONS.RECEIVE
      ? moneyIn
      : direction === MONEY_DIRECTIONS.PAY
        ? moneyOut
        : null;

  const directionOptions = Object.entries(side.money);

  /**
   * جهت را عوض می‌کند: اسلاتِ تازه را فعال می‌کند و آن یکی را خالی —
   * هرگز هر دو هم‌زمان فعال نیستند. روشی که برای جهتِ تازه مجاز نیست
   * باید کنار برود، وگرنه «اعتبار خرید بعدی» روی «دریافت از مشتری» جا
   * می‌ماند و اعتبارسنجی بی‌دلیل شکست می‌خورد.
   */
  const handleDirectionChange = (nextDirection) => {
    if (nextDirection === MONEY_DIRECTIONS.NONE) {
      onChange({ moneyIn: emptyMoneyEffect(), moneyOut: emptyMoneyEffect() });
      return;
    }
    const allowed = methodsForDirection(nextDirection);
    const method =
      active && allowed.includes(active.method) ? active.method : PaymentTypeEnum.CASH;
    // با انتخاب یک جهتِ واقعی، مبلغ پیش‌فرض همان ارزشِ این تصمیم است؛
    // کاربر می‌تواند دستی تغییرش دهد.
    const amount =
      active && Number(active.amount) > 0 ? active.amount : String(defaultAmount ?? "");
    const nextSlot = { enabled: true, method, amount, reference: "", parts: [] };
    onChange(
      nextDirection === MONEY_DIRECTIONS.RECEIVE
        ? { moneyIn: nextSlot, moneyOut: emptyMoneyEffect() }
        : { moneyIn: emptyMoneyEffect(), moneyOut: nextSlot },
    );
  };

  const patchActive = (changes) => {
    if (!active) return;
    onChange(
      direction === MONEY_DIRECTIONS.RECEIVE
        ? { moneyIn: { ...moneyIn, ...changes } }
        : { moneyOut: { ...moneyOut, ...changes } },
    );
  };

  if (direction === MONEY_DIRECTIONS.NONE) {
    return (
      <DirectionSelect
        direction={direction}
        onChange={handleDirectionChange}
        options={directionOptions}
      />
    );
  }

  const isMixed = active.method === PaymentTypeEnum.MIXED;
  const referenceLabel = PAYMENT_REFERENCE_FIELDS[active.method]?.label;
  const methodOptions = methodsForDirection(direction);
  const parts = active.parts ?? [];

  return (
    <div className="space-y-2">
      <DirectionSelect
        direction={direction}
        onChange={handleDirectionChange}
        options={directionOptions}
      />

      <div className="space-y-2 rounded-md border border-border bg-card/60 p-2.5">
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">روش</Label>
          {/* روش پرداخت enum عددی است؛ Radix فقط رشته می‌شناسد. */}
          <Select
            value={String(active.method)}
            onValueChange={(raw) => {
              const nextMethod = Number(raw);
              patchActive({
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
          // MixedPaymentList مشترک (بینِ اینجا و فرمِ خرید/فروش) هر ردیف
          // را با فیلدِ `type` می‌شناسد؛ ردیف‌های واقعیِ ما با نامِ بک‌اند
          // (`method`) نگه داشته می‌شوند، پس فقط همین‌جا موقتِ نمایش
          // نگاشت می‌شود — نه یک لایه‌ی تبدیلِ مستقل.
          <MixedPaymentList
            dense
            title="ردیف‌های پرداخت"
            payments={parts.map((part) => ({ ...part, type: part.method }))}
            onAdd={() => patchActive({ parts: [...parts, { ...EMPTY_PART }] })}
            onRemove={(idx) => patchActive({ parts: parts.filter((_, i) => i !== idx) })}
            onChange={(idx, field, value) =>
              patchActive({
                parts: parts.map((part, i) =>
                  i === idx
                    ? { ...part, [field === "type" ? "method" : field]: value }
                    : part,
                ),
              })
            }
          />
        ) : (
          <>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">
                مبلغ (ریال)
              </Label>
              <PriceInput
                min={0}
                value={active.amount === "" || active.amount == null ? null : Number(active.amount)}
                onValueChange={(next) => patchActive({ amount: next ?? "" })}
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
                  value={active.reference ?? ""}
                  onChange={(e) => patchActive({ reference: e.target.value })}
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

function DirectionSelect({ direction, onChange, options }) {
  return (
    <Select value={String(direction)} onValueChange={(raw) => onChange(Number(raw))}>
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
