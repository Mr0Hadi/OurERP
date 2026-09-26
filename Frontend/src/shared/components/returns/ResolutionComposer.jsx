import { useCallback, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";

import {
  MONEY_DIRECTIONS,
  emptyComposition,
  expandComposition,
  moneyDirectionOf,
  suggestedMoneyAmount,
  validateComposition,
} from "@/shared/domain/returns/resolutions";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { useSyncedComputedValue } from "@/shared/hooks/useSyncedComputedValue";
import GoodsItemsPicker from "./GoodsItemsPicker";
import ResolutionMoneySection from "./ResolutionMoneySection";
import EffectBadge from "./EffectBadge";

const fa = (value) => (Number(value) || 0).toLocaleString("fa-IR");

/**
 * ثبت یک تصمیم برای بخشی از یک ادعا — مشترک بین خرید و فروش.
 *
 * چند سوال مستقل، نه یک فهرست از حالت‌های از پیش ترکیب‌شده:
 *
 *   ۱ و ۲. کالا وارد انبار شود؟ کالا از انبار خارج شود؟
 *   ۳.     فقط خرید، وقتی کالایی از این ادعا در قرنطینه است: آزاد یا اسقاط شود؟
 *   ۴.     پولی جابه‌جا شود؟ چقدر؟ همین حالا یا بعداً؟
 *
 * یا به‌جای همه‌ی این‌ها: این تعداد صریحاً بخشیده شود.
 *
 * تصمیم دستِ کارمند است: هیچ قیمت یا بهایی از او خواسته نمی‌شود و هیچ
 * ترازی بین کالا و پول اجبار نمی‌شود. فقط مبلغِ پول با «تعداد × قیمتِ
 * ادعا» پیشنهاد می‌شود و قابل تغییر است.
 *
 * `quarantineAvailable` (فقط خرید): تعدادِ کالای این ادعا در قرنطینه؛
 * `null` یعنی نامعلوم.
 */
export default function ResolutionComposer({
  claim,
  remaining,
  onAdd,
  isBusy,
  side,
  quarantineAvailable = null,
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
  // آزادسازی فقط از قرنطینه است، پس فقط وقتی کالایی از این ادعا آنجاست دیده
  // می‌شود. اسقاط می‌تواند از موجودی هم باشد (عیبی که بعد از دریافت روی قفسه
  // پیدا شده) و مبدأش را انبار موقعِ اجرا می‌گوید.
  const quarantineSlots = side.quarantineSlots.filter(
    ({ slot }) => slot !== "goodsRelease" || quarantineAvailable !== 0,
  );
  const showQuarantine = allowQuarantine && quarantineSlots.length > 0;

  const defaultClaimItem = (quantityForItem) => ({
    productId: claim.productId ?? null,
    productCode: claim.productCode ?? "",
    productName: claim.productName ?? "",
    unit: claim.unit ?? "",
    quantity: quantityForItem,
    unitPrice: claimPrice,
    discount: 0,
  });

  const direction = moneyDirectionOf(composition);
  const activeMoneySlotName =
    direction === MONEY_DIRECTIONS.RECEIVE
      ? "moneyIn"
      : direction === MONEY_DIRECTIONS.PAY
        ? "moneyOut"
        : null;
  const activeMoney = activeMoneySlotName ? composition[activeMoneySlotName] : null;

  // فقط پیشنهاد: وقتی کاربر جهتِ پول را باز می‌کند، مبلغ با همین پر می‌شود
  // و تا وقتی دستی عوضش نکرده با تعداد همگام می‌ماند.
  const defaultMoneyAmount = suggestedMoneyAmount(composition, claim);

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

  const previewEffects = useMemo(
    () => expandComposition(composition, claim),
    [composition, claim],
  );

  const errors = useMemo(
    () =>
      validateComposition(composition, claim, {
        remainingQuantity: remaining,
        allowQuarantine,
        quarantineAvailable,
      }),
    [composition, claim, remaining, allowQuarantine, quarantineAvailable],
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
          {side.goodsSlots.map(({ slot, label, hint, allowPicker }) => (
            <div key={slot} className="space-y-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <Checkbox
                  checked={composition[slot].enabled}
                  onCheckedChange={(checked) =>
                    patchSlot(slot, {
                      enabled: checked === true,
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

              {composition[slot].enabled && allowPicker && (
                <GoodsItemsPicker
                  items={composition[slot].items}
                  onItemsChange={(items) => patchSlot(slot, { items })}
                />
              )}
            </div>
          ))}

          {showQuarantine &&
            quarantineSlots.map(({ slot, label, hint }) => (
              <label key={slot} className="flex items-start gap-2 cursor-pointer">
                <Checkbox
                  checked={composition[slot].enabled}
                  onCheckedChange={(checked) => patchSlot(slot, { enabled: checked === true })}
                  className="mt-0.5"
                />
                <span className="text-xs text-card-foreground">
                  {label}
                  <span className="block text-[11px] text-muted-foreground">
                    {fa(quantity)} {claim.unit || "عدد"} از {claim.productName} — {hint}
                    {slot === "goodsRelease" &&
                      quarantineAvailable != null &&
                      ` (در قرنطینه: ${fa(quarantineAvailable)})`}
                  </span>
                </span>
              </label>
            ))}

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
