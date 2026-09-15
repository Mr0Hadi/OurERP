import { useCallback, useMemo, useState } from "react";
import { Plus, Scale } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { PriceInput } from "@/shared/components/ui/price-input";

import {
  MONEY_DIRECTIONS,
  defaultQuarantineUnitCost,
  emptyComposition,
  compositionWarnings,
  emptyMoneyEffect,
  expandComposition,
  moneyAmountOf,
  moneyBalanceBreakdown,
  moneyBalanceOf,
  moneyDirectionOf,
  validateComposition,
} from "@/shared/domain/returns/resolutions";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { useSyncedComputedValue } from "@/shared/hooks/useSyncedComputedValue";
import GoodsItemsPicker from "./GoodsItemsPicker";
import ResolutionMoneySection from "./ResolutionMoneySection";
import EffectBadge from "./EffectBadge";

const fa = (value) => (Number(value) || 0).toLocaleString("fa-IR");

const priceValue = (value) => (value === "" || value == null ? null : Number(value));

/**
 * مابه‌التفاوت، قدم‌به‌قدم: ارزشِ هر کالای ورودی مثبت و هر کالای خروجی
 * منفی، و جمعشان همان مبلغی است که در «جابه‌جایی پول» پیش‌فرض گذاشته
 * شده — تا کاربر بداند عدد از کجا آمده، نه اینکه فقط آن را ببیند.
 */
function BalanceBreakdown({
  rows,
  side,
  requiredDirection,
  requiredAmount,
  activeAmount,
  onApply,
}) {
  if (rows.length === 0) return null;
  const isBalanced = requiredAmount === 0;
  const isShort = activeAmount != null && activeAmount < requiredAmount;

  return (
    <div className="space-y-1.5 rounded-md border border-border bg-muted/40 p-2 text-[11px]">
      <p className="flex items-center gap-1.5 font-medium text-card-foreground">
        <Scale className="h-3.5 w-3.5 shrink-0" />
        محاسبه‌ی مابه‌التفاوت
      </p>
      <ul className="space-y-0.5 tabular-nums">
        {rows.map((row, index) => (
          <li key={index} className="flex justify-between gap-2 text-muted-foreground">
            <span className="truncate">
              {side.effectLabels[row.direction]} · {row.productName} · {fa(row.quantity)} ×{" "}
              {fa(row.unitPrice)}
            </span>
            <span className={row.value < 0 ? "text-destructive" : "text-card-foreground"}>
              {row.value < 0 ? "−" : "+"}
              {fa(Math.abs(row.value))}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex justify-between gap-2 border-t border-border pt-1 font-medium text-card-foreground">
        <span>
          {isBalanced
            ? "تراز صفر است؛ پولی لازم نیست"
            : `باید ${side.money[requiredDirection]} شود (دست‌کم)`}
        </span>
        {!isBalanced && <span className="tabular-nums">{fa(requiredAmount)} ریال</span>}
      </div>
      {!isBalanced && (
        <p className="text-muted-foreground">
          همین مبلغ به‌عنوان پیش‌فرض در «جابه‌جایی پول» گذاشته شده؛ بیشتر از آن هم مجاز است.
          {isShort && onApply && (
            <button
              type="button"
              className="mr-1 text-primary underline underline-offset-2"
              onClick={onApply}
            >
              برگرداندن به مبلغ محاسبه‌شده
            </button>
          )}
        </p>
      )}
    </div>
  );
}

/**
 * ثبت یک تصمیم برای بخشی از یک ادعا — مشترک بین خرید و فروش.
 *
 * چند سوال مستقل، نه یک فهرست از حالت‌های از پیش ترکیب‌شده:
 *
 *   ۱ و ۲. کالا وارد انبار شود؟ کالا از انبار خارج شود؟ (هر کدام با قیمتِ معامله)
 *   ۳.     فقط خرید: کالای قرنطینه آزاد یا اسقاط شود؟
 *   ۴.     پولی جابه‌جا شود؟ همین حالا یا بعداً؟
 *
 * یا به‌جای همه‌ی این‌ها: این تعداد صریحاً بخشیده شود.
 *
 * قاعده‌ی تراز زنده حساب می‌شود: وقتی ارزش کالای ورودی و خروجی برابر
 * نیست، جهت و مبلغِ لازمِ پول پیشنهاد می‌شود — همان قاعده‌ای که سرور با
 * ۴۰۰ اعمال می‌کند.
 */
export default function ResolutionComposer({
  claim,
  remaining,
  onAdd,
  isBusy,
  side,
}) {
  const [composition, setComposition] = useState(() =>
    emptyComposition(remaining),
  );

  // تنظیم تعداد هنگام تغییر باقیمانده، در خودِ رندر — نه در useEffect،
  // که یک رندر اضافه با مقدار کهنه می‌ساخت.
  const [syncedRemaining, setSyncedRemaining] = useState(remaining);
  if (remaining !== syncedRemaining) {
    setSyncedRemaining(remaining);
    setComposition((prev) => ({ ...prev, quantity: remaining }));
  }

  const patch = useCallback(
    (changes) => setComposition((prev) => ({ ...prev, ...changes })),
    [],
  );

  const patchSlot = (slot, changes) =>
    setComposition((prev) => ({
      ...prev,
      [slot]: { ...prev[slot], ...changes },
    }));

  const claimPrice = Number(claim.unitPrice) || 0;
  const quantity = Number(composition.quantity) || 0;
  const allowQuarantine = side.quarantineSlots.length > 0;

  const defaultClaimItem = (quantityForItem) => ({
    productId: claim.productId ?? null,
    productCode: claim.productCode ?? "",
    productName: claim.productName ?? "",
    unit: claim.unit ?? "",
    quantity: quantityForItem,
    unitPrice: claimPrice,
    discount: 0,
  });

  const { requiredDirection, requiredAmount } = moneyBalanceOf(composition, claim);
  const hasTradedGoods = composition.goodsIn.enabled || composition.goodsOut.enabled;
  const direction = moneyDirectionOf(composition);
  const activeMoneySlotName =
    direction === MONEY_DIRECTIONS.RECEIVE
      ? "moneyIn"
      : direction === MONEY_DIRECTIONS.PAY
        ? "moneyOut"
        : null;
  const activeMoney = activeMoneySlotName ? composition[activeMoneySlotName] : null;

  // مبلغِ پیش‌فرض: وقتی کالا معامله می‌شود همان ترازِ لازم است، وگرنه
  // ارزشِ همین تعداد از ادعا (بازپرداختِ بدون جابه‌جایی کالا).
  const defaultMoneyAmount = hasTradedGoods ? requiredAmount : quantity * claimPrice;

  // مبلغ با تعداد و قیمت همگام می‌ماند تا کاربر دستی تغییرش نداده باشد.
  useSyncedComputedValue(
    defaultMoneyAmount,
    (value) => patchSlot(activeMoneySlotName, { amount: String(value) }),
    Boolean(activeMoney) && activeMoney.method !== PaymentTypeEnum.MIXED,
  );

  const moneyParts = activeMoney?.parts || [];
  useSyncedComputedValue(
    defaultMoneyAmount,
    (value) =>
      patchSlot(activeMoneySlotName, {
        parts: moneyParts.map((part, i) =>
          i === 0 ? { ...part, amount: String(value) } : part,
        ),
      }),
    Boolean(activeMoney) &&
      activeMoney.method === PaymentTypeEnum.MIXED &&
      moneyParts.length === 1,
  );

  // وقتی ترازِ کالا جهتِ پول را اجبار می‌کند، همان جهت خودکار باز می‌شود
  // — کاربر نباید برای یک قاعده‌ی حسابداری دنبال دکمه بگردد.
  const applyRequiredMoney = useCallback(
    (required) => {
      if (required === MONEY_DIRECTIONS.NONE) return;
      setComposition((prev) => {
        const current = moneyDirectionOf(prev);
        if (current === required) return prev;
        const { requiredAmount: amount } = moneyBalanceOf(prev, claim);
        const slot = { ...emptyMoneyEffect(), enabled: true, amount: String(amount) };
        return required === MONEY_DIRECTIONS.RECEIVE
          ? { ...prev, moneyIn: slot, moneyOut: emptyMoneyEffect() }
          : { ...prev, moneyIn: emptyMoneyEffect(), moneyOut: slot };
      });
    },
    [claim],
  );
  useSyncedComputedValue(requiredDirection, applyRequiredMoney, !composition.writeOff);

  const previewEffects = useMemo(
    () => expandComposition(composition, claim),
    [composition, claim],
  );

  const errors = useMemo(
    () =>
      validateComposition(composition, claim, {
        remainingQuantity: remaining,
        allowQuarantine,
      }),
    [composition, claim, remaining, allowQuarantine],
  );

  // نمایش داده می‌شوند ولی ثبت را قفل نمی‌کنند.
  const warnings = useMemo(
    () => compositionWarnings(composition, claim),
    [composition, claim],
  );

  const handleSubmit = () => {
    if (errors.length > 0) return;
    onAdd(composition);
    setComposition(emptyComposition(remaining));
  };

  const toggleWriteOff = (checked) =>
    setComposition((prev) =>
      checked
        ? { ...emptyComposition(prev.quantity), note: prev.note, writeOff: true }
        : { ...prev, writeOff: false },
    );

  return (
    <div className="rounded-lg border border-dashed border-primary/30 bg-primary/[0.03] p-3 space-y-3">
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">
          این تصمیم برای چند عدد از این ادعاست؟ (باقیمانده: {fa(remaining)})
        </Label>
        <Input
          type="number"
          min={1}
          max={remaining}
          value={composition.quantity}
          onChange={(e) => patch({ quantity: Number(e.target.value) || 0 })}
          className="h-8 text-xs text-center"
        />
      </div>

      {!composition.writeOff && (
        <>
          {side.goodsSlots.map(({ slot, label, hint, priceLabel, allowPicker }) => (
            <div key={slot} className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox
                  checked={composition[slot].enabled}
                  onCheckedChange={(checked) =>
                    patchSlot(slot, {
                      enabled: checked === true,
                      unitPrice:
                        composition[slot].unitPrice === ""
                          ? String(claimPrice)
                          : composition[slot].unitPrice,
                      items:
                        checked === true
                          ? allowPicker && composition[slot].items.length === 0
                            ? [defaultClaimItem(quantity)]
                            : composition[slot].items
                          : [],
                    })
                  }
                  className="mt-0.5"
                />
                <span className="text-xs text-card-foreground">
                  {label}
                  <span className="block text-[11px] text-muted-foreground">
                    {allowPicker
                      ? hint
                      : `${fa(quantity)} ${claim.unit || "عدد"} از ${claim.productName} — ${hint}`}
                  </span>
                </span>
              </label>

              {composition[slot].enabled &&
                (allowPicker ? (
                  // قیمتِ هر قلم در جدولِ انتخابگر ویرایش می‌شود.
                  <GoodsItemsPicker
                    items={composition[slot].items}
                    onItemsChange={(items) => patchSlot(slot, { items })}
                  />
                ) : (
                  <div className="space-y-1 pr-6">
                    <Label className="text-[11px] text-muted-foreground">
                      {priceLabel} (ریال)
                    </Label>
                    <PriceInput
                      min={0}
                      value={priceValue(composition[slot].unitPrice)}
                      onValueChange={(next) =>
                        patchSlot(slot, { unitPrice: next ?? "" })
                      }
                      placeholder="صفر هم مجاز است"
                      className="h-8 text-xs"
                    />
                  </div>
                ))}
            </div>
          ))}

          {side.quarantineSlots.map(({ slot, label, hint, costLabel }) => (
            <div key={slot} className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox
                  checked={composition[slot].enabled}
                  onCheckedChange={(checked) =>
                    patchSlot(slot, {
                      enabled: checked === true,
                      unitCost:
                        composition[slot].unitCost === ""
                          ? String(defaultQuarantineUnitCost(claim))
                          : composition[slot].unitCost,
                    })
                  }
                  className="mt-0.5"
                />
                <span className="text-xs text-card-foreground">
                  {label}
                  <span className="block text-[11px] text-muted-foreground">
                    {fa(quantity)} {claim.unit || "عدد"} از {claim.productName} — {hint}
                  </span>
                </span>
              </label>

              {composition[slot].enabled && (
                <div className="space-y-1 pr-6">
                  <Label className="text-[11px] text-muted-foreground">
                    {costLabel} (ریال)
                  </Label>
                  <PriceInput
                    min={0}
                    value={priceValue(composition[slot].unitCost)}
                    onValueChange={(next) => patchSlot(slot, { unitCost: next ?? "" })}
                    placeholder="خالی = میانگین جاری"
                    className="h-8 text-xs"
                  />
                </div>
              )}
            </div>
          ))}

          {hasTradedGoods && (
            <BalanceBreakdown
              rows={moneyBalanceBreakdown(composition, claim)}
              side={side}
              requiredDirection={requiredDirection}
              requiredAmount={requiredAmount}
              activeAmount={
                activeMoney && direction === requiredDirection
                  ? moneyAmountOf(activeMoney)
                  : null
              }
              onApply={
                activeMoney && direction === requiredDirection
                  ? () =>
                      patchSlot(activeMoneySlotName, {
                        amount: String(requiredAmount),
                      })
                  : null
              }
            />
          )}

          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">جابه‌جایی پول</Label>
            <ResolutionMoneySection
              moneyIn={composition.moneyIn}
              moneyOut={composition.moneyOut}
              // ResolutionMoneySection شیءِ جزئیِ {moneyIn?, moneyOut?} را
              // مستقیم می‌سازد (چون تغییرِ جهت هر دو اسلات را با هم عوض
              // می‌کند)؛ `patch` همان را مستقیم روی ترکیب می‌نشاند.
              onChange={patch}
              side={side}
              defaultAmount={defaultMoneyAmount}
            />
          </div>
        </>
      )}

      <label className="flex items-start gap-2 cursor-pointer">
        <Checkbox
          checked={composition.writeOff}
          onCheckedChange={(checked) => toggleWriteOff(checked === true)}
          className="mt-0.5"
        />
        <span className="text-xs text-card-foreground">
          این تعداد بخشیده شود
          <span className="block text-[11px] text-muted-foreground">
            بدون هیچ جابه‌جایی کالا یا پول بسته می‌شود — مثلاً ادعای ناچیزی که پیگیری‌اش ارزش ندارد
          </span>
        </span>
      </label>

      <Input
        value={composition.note}
        onChange={(e) => patch({ note: e.target.value })}
        placeholder="یادداشت (اختیاری)..."
        className="h-8 text-xs"
      />

      {previewEffects.length > 0 && (
        <div className="space-y-1 rounded-md border border-border bg-card/60 p-2">
          <p className="text-[11px] text-muted-foreground">
            با ثبت این تصمیم، این اتفاق‌ها می‌افتد:
          </p>
          <div className="space-y-0.5">
            {previewEffects.map((effect) => (
              <EffectBadge
                key={effect.id}
                effect={effect}
                side={side}
                showProductName
              />
            ))}
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <p className="text-[11px] text-destructive px-0.5">{errors[0]}</p>
      )}

      {warnings.map((warning) => (
        <p key={warning} className="text-[11px] text-amber-700 dark:text-amber-400 px-0.5">
          {warning}
        </p>
      ))}

      <Button
        type="button"
        size="sm"
        className="w-full gap-1.5 h-8 text-xs"
        onClick={handleSubmit}
        disabled={isBusy || errors.length > 0}
      >
        <Plus className="h-3.5 w-3.5" />
        {composition.writeOff ? "بخشیدنِ" : "ثبت این تصمیم برای"} {fa(quantity)} عدد
      </Button>
    </div>
  );
}
