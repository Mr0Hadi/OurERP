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
} from "../../domain/returnResolutions";
import ReplacementItemsPicker from "./ReplacementItemsPicker";
import ResolutionMoneySection from "./ResolutionMoneySection";
import EffectBadge from "./EffectBadge";

/**
 * ثبت یک تصمیم برای بخشی از یک ادعا.
 *
 * سه سوال مستقل، نه یک فهرست از حالت‌های از پیش ترکیب‌شده:
 *
 *   ۱. کالا از مشتری پس گرفته شود؟
 *   ۲. کالایی برای مشتری ارسال شود؟ (هر کالایی، با هر تعدادی)
 *   ۳. پولی جابه‌جا شود؟ (دریافت / پرداخت / اعتبار)
 *
 * هر ترکیبی از این سه مجاز است، از «فقط پس‌گرفتن بدون جبران» تا
 * «پس‌گرفتن + ارسال دو کالای دیگر + دریافت مابه‌التفاوت». پیش از ثبت،
 * اثرهای واقعیِ همان ترکیب نشان داده می‌شوند تا کاربر ببیند دقیقاً چه
 * چیزی روی موجودی و پول خواهد نشست.
 */
export default function ResolutionComposer({ claim, remaining, onAdd, isBusy }) {
  const [composition, setComposition] = useState(() =>
    emptyComposition(remaining),
  );

  // تنظیم تعداد هنگام تغییر باقیمانده، در خودِ رندر — نه در useEffect،
  // که یک رندر اضافه با مقدار کهنه می‌ساخت.
  const [syncedRemaining, setSyncedRemaining] = useState(remaining);
  if (remaining !== syncedRemaining) {
    setSyncedRemaining(remaining);
    setComposition((prev) => ({ ...prev, qty: remaining }));
  }

  const patch = (changes) =>
    setComposition((prev) => ({ ...prev, ...changes }));

  const patchMoney = (changes) =>
    setComposition((prev) => ({
      ...prev,
      money: { ...prev.money, ...changes },
    }));

  const previewEffects = useMemo(
    () => expandComposition(composition, claim),
    [composition, claim],
  );

  const errors = useMemo(
    () => validateComposition(composition, claim, { remainingQty: remaining }),
    [composition, claim, remaining],
  );

  const handleSubmit = () => {
    if (errors.length > 0) return;
    onAdd(composition);
    setComposition(emptyComposition(remaining));
  };

  const qty = Number(composition.qty) || 0;

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
          value={composition.qty}
          onChange={(e) => patch({ qty: Number(e.target.value) || 0 })}
          className="h-8 text-xs text-center"
        />
      </div>

      {/* ۱ — پس‌گرفتن کالا */}
      <label className="flex items-start gap-2 cursor-pointer">
        <Checkbox
          checked={composition.takeBack}
          onCheckedChange={(checked) => patch({ takeBack: checked === true })}
          className="mt-0.5"
        />
        <span className="text-xs text-card-foreground">
          کالا از مشتری پس گرفته شود
          <span className="block text-[11px] text-muted-foreground">
            {qty.toLocaleString("fa-IR")} {claim.unit || "عدد"} از{" "}
            {claim.productName} به انبار برمی‌گردد
          </span>
        </span>
      </label>

      {/* ۲ — ارسال کالا */}
      <div className="space-y-2">
        <label className="flex items-start gap-2 cursor-pointer">
          <Checkbox
            checked={composition.sendReplacement}
            onCheckedChange={(checked) =>
              patch({
                sendReplacement: checked === true,
                replacementItems: checked === true ? composition.replacementItems : [],
              })
            }
            className="mt-0.5"
          />
          <span className="text-xs text-card-foreground">
            کالای جایگزین برای مشتری ارسال شود
            <span className="block text-[11px] text-muted-foreground">
              می‌تواند همان کالا باشد یا کالای دیگری، با هر تعدادی
            </span>
          </span>
        </label>

        {composition.sendReplacement && (
          <ReplacementItemsPicker
            items={composition.replacementItems}
            onItemsChange={(items) => patch({ replacementItems: items })}
          />
        )}
      </div>

      {/* ۳ — پول */}
      <div className="space-y-1.5">
        <Label className="text-[11px] text-muted-foreground">
          جابه‌جایی پول
        </Label>
        <ResolutionMoneySection money={composition.money} onChange={patchMoney} />
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
          <div className="flex flex-wrap gap-1">
            {previewEffects.map((effect) => (
              <EffectBadge key={effect.id} effect={effect} showProductName />
            ))}
          </div>
        </div>
      ) : (
        composition.money?.direction === MONEY_DIRECTIONS.NONE &&
        !composition.takeBack &&
        !composition.sendReplacement && (
          <p className="text-[11px] text-muted-foreground px-0.5">
            هنوز هیچ اقدامی انتخاب نشده. برای رد این بخش از ادعا، «کالا پس
            گرفته شود» را بزنید و بقیه را خالی بگذارید — یا اگر قرار نیست هیچ
            اتفاقی بیفتد، کل مرجوعی را با دکمه‌ی «رد ادعای مشتری» ببندید.
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
        ثبت این تصمیم برای {qty.toLocaleString("fa-IR")} عدد
      </Button>
    </div>
  );
}
