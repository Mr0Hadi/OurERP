import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";

import {
  MONEY_DIRECTIONS,
  emptyComposition,
  expandComposition,
  validateComposition,
} from "@/shared/domain/returns/resolutions";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { useSyncedComputedValue } from "@/shared/hooks/useSyncedComputedValue";
import GoodsItemsPicker from "./GoodsItemsPicker";
import ResolutionMoneySection from "./ResolutionMoneySection";
import EffectBadge from "./EffectBadge";

/**
 * ثبت یک تصمیم برای بخشی از یک ادعا — مشترک بین خرید و فروش.
 *
 * سه سوال مستقل، نه یک فهرست از حالت‌های از پیش ترکیب‌شده:
 *
 *   ۱ و ۲. کالا وارد انبار شود؟ کالا از انبار خارج شود؟
 *   ۳.     پولی جابه‌جا شود؟
 *
 * ترتیب و برچسبِ دو محورِ کالایی را side تعیین می‌کند: در فروش اول
 * «پس‌گرفتن از مشتری» می‌آید و در خرید اول «عودت به تامین‌کننده» — که
 * زیرِ پوسته همان GOODS_IN و GOODS_OUT هستند.
 *
 * پیش از ثبت، اثرهای واقعیِ همان ترکیب نشان داده می‌شوند تا کاربر
 * ببیند دقیقاً چه چیزی روی موجودی و پول خواهد نشست.
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

  const patch = (changes) => setComposition((prev) => ({ ...prev, ...changes }));

  const patchSlot = (slot, changes) =>
    setComposition((prev) => ({
      ...prev,
      [slot]: { ...prev[slot], ...changes },
    }));

  const defaultClaimItem = (quantityForItem) => ({
    productId: claim.productId ?? null,
    productCode: claim.productCode ?? "",
    productName: claim.productName ?? "",
    unit: claim.unit ?? "",
    quantity: quantityForItem,
    unitPrice: claim.unitPrice ?? 0,
    discount: 0,
  });

  const patchMoney = (changes) =>
    setComposition((prev) => ({
      ...prev,
      money: { ...prev.money, ...changes },
    }));

  // مبلغِ جابه‌جاییِ پول همیشه با تعداد و قیمتِ همین تصمیم همگام
  // می‌ماند — با هر تغییری در تعداد، نه فقط لحظه‌ی انتخاب جهتِ پول.
  const defaultMoneyAmount =
    (Number(composition.quantity) || 0) * (Number(claim.unitPrice) || 0);
  useSyncedComputedValue(
    defaultMoneyAmount,
    (value) => patchMoney({ amount: String(value) }),
    composition.money.direction !== MONEY_DIRECTIONS.NONE &&
      composition.money.method !== PaymentTypeEnum.MIXED,
  );

  // برای پرداخت ترکیبی، تا وقتی فقط یک ردیف هست (یعنی هنوز تقسیم
  // نشده) همان ردیف هم با تعداد و قیمت همگام می‌ماند.
  const moneyParts = composition.money.parts || [];
  useSyncedComputedValue(
    defaultMoneyAmount,
    (value) =>
      patchMoney({
        parts: moneyParts.map((part, i) =>
          i === 0 ? { ...part, amount: String(value) } : part,
        ),
      }),
    composition.money.direction !== MONEY_DIRECTIONS.NONE &&
      composition.money.method === PaymentTypeEnum.MIXED &&
      moneyParts.length === 1,
  );

  const previewEffects = useMemo(
    () => expandComposition(composition, claim),
    [composition, claim],
  );

  const errors = useMemo(
    () => validateComposition(composition, claim, { remainingQuantity: remaining }),
    [composition, claim, remaining],
  );

  const handleSubmit = () => {
    if (errors.length > 0) return;
    onAdd(composition);
    setComposition(emptyComposition(remaining));
  };

  const quantity = Number(composition.quantity) || 0;
  const nothingChosen =
    !composition.goodsIn.enabled &&
    !composition.goodsOut.enabled &&
    composition.money?.direction === MONEY_DIRECTIONS.NONE;

  return (
    <div className="rounded-lg border border-dashed border-primary/30 bg-primary/[0.03] p-3 space-y-3">
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">
          این تصمیم برای چند عدد از این ادعاست؟ (باقیمانده:{" "}
          {remaining.toLocaleString("fa-IR")})
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
                  : `${quantity.toLocaleString("fa-IR")} ${claim.unit || "عدد"} از ${claim.productName} — ${hint}`}
              </span>
            </span>
          </label>

          {allowPicker && composition[slot].enabled && (
            <GoodsItemsPicker
              items={composition[slot].items}
              onItemsChange={(items) => patchSlot(slot, { items })}
            />
          )}
        </div>
      ))}

      <div className="space-y-1.5">
        <Label className="text-[11px] text-muted-foreground">جابه‌جایی پول</Label>
        <ResolutionMoneySection
          money={composition.money}
          onChange={patchMoney}
          side={side}
          defaultAmount={defaultMoneyAmount}
        />
      </div>

      <Input
        value={composition.note}
        onChange={(e) => patch({ note: e.target.value })}
        placeholder="یادداشت (اختیاری)..."
        className="h-8 text-xs"
      />

      {previewEffects.length > 0 ? (
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
      ) : (
        nothingChosen && (
          <p className="text-[11px] text-muted-foreground px-0.5">
            هنوز هیچ اقدامی انتخاب نشده. برای بستنِ این تعداد بدون هیچ جبرانی،
            کل مرجوعی را با دکمه‌ی «رد ادعا» ببندید.
          </p>
        )
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
        ثبت این تصمیم برای {quantity.toLocaleString("fa-IR")} عدد
      </Button>
    </div>
  );
}
