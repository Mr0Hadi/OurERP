import {
  PackageMinus,
  PackagePlus,
  ArrowDownLeft,
  ArrowUpRight,
  PackageCheck,
  PackageX,
} from "lucide-react";
import {
  EFFECT_DIRECTIONS,
  EFFECT_STATUSES,
  isGoodsEffect,
  isTradedGoodsEffect,
  observationsOf,
} from "@/shared/domain/returns/effects";
import {
  PAYMENT_TYPE_LABELS,
  RETURN_PAYMENT_METHODS,
} from "@/shared/domain/enums/paymentType";
import { RETURN_PROBLEM_LABELS } from "@/shared/domain/returns/problems";
import { formatNumber } from "@/shared/lib/numberFormat";
import { toneText } from "@/shared/lib/tone";

const ICONS = {
  [EFFECT_DIRECTIONS.GOODS_IN]: PackagePlus,
  [EFFECT_DIRECTIONS.GOODS_OUT]: PackageMinus,
  [EFFECT_DIRECTIONS.MONEY_IN]: ArrowDownLeft,
  [EFFECT_DIRECTIONS.MONEY_OUT]: ArrowUpRight,
  [EFFECT_DIRECTIONS.GOODS_RELEASE]: PackageCheck,
  [EFFECT_DIRECTIONS.GOODS_SCRAP]: PackageX,
};

/** رنگِ هر جهتِ اثر: ورودی‌ها سبز، خروجِ پول قرمز، بقیه بی‌طرف‌تر. */
const ACCENTS = {
  [EFFECT_DIRECTIONS.GOODS_IN]: toneText("success"),
  [EFFECT_DIRECTIONS.GOODS_OUT]: toneText("primary"),
  [EFFECT_DIRECTIONS.MONEY_IN]: toneText("success"),
  [EFFECT_DIRECTIONS.MONEY_OUT]: toneText("danger"),
  [EFFECT_DIRECTIONS.GOODS_RELEASE]: toneText("info"),
  [EFFECT_DIRECTIONS.GOODS_SCRAP]: toneText("neutral"),
};

/**
 * یک اثر پایه، به‌صورت یک سطرِ کوتاه.
 *
 * برچسبِ کوتاهِ هر اثر از side می‌آید، چون یک GOODS_IN در فروش
 * «پس‌گرفتن» است و در خرید «دریافت کالا» — همان اثر، دو اسم.
 *
 * سطر است نه بج، چون نسخه‌ی بجی روی موبایل تا ۳۰۰ پیکسل پهن می‌شد و
 * از کارتِ ۲۳۰ پیکسلی می‌زد بیرون.
 */
export default function EffectBadge({ effect, side, showProductName = false }) {
  const Icon = ICONS[effect.direction];
  const isGoods = isGoodsEffect(effect.direction);
  const isPending = effect.status === EFFECT_STATUSES.PENDING;
  const done = Number(effect.appliedQuantity) || 0;

  const value = isGoods
    ? `${formatNumber(effect.quantity)} ${effect.unit || "عدد"}`
    : `${formatNumber(effect.amount)} ریال`;

  const restocked = Number(effect.restockedQuantity) || 0;
  const isIncoming = effect.direction === EFFECT_DIRECTIONS.GOODS_IN;
  const hasUnitPrice = isTradedGoodsEffect(effect.direction) && effect.unitPrice != null;

  const details = [
    showProductName && isGoods ? effect.productName : null,
    hasUnitPrice ? `هر عدد ${formatNumber(effect.unitPrice)} ریال` : null,
    // روش پرداخت enum عددی است و «نقدی» صفر — بررسیِ صریح لازم است.
    // عددی بیرون از روش‌های مرجوعی (مثلاً ۵ که در `PaymentTypeEnum` «اقساطی»
    // است) نباید با برچسبِ آن نوعِ سند خوانده شود.
    !isGoods && effect.method != null
      ? RETURN_PAYMENT_METHODS.includes(effect.method)
        ? PAYMENT_TYPE_LABELS[effect.method]
        : "روش نامشخص"
      : null,
    isGoods && done > 0 ? `${formatNumber(done)} انجام‌شده` : null,
    // برای کالای برگشتی، «انجام شد» و «به موجودی برگشت» یکی نیستند:
    // کالای معیوب تحویل گرفته می‌شود ولی وارد موجودی قابل‌فروش نمی‌شود.
    isIncoming && done > 0 && restocked !== done
      ? `${formatNumber(restocked)} به موجودی`
      : null,
    isPending ? (isGoods ? "در انتظار انبار" : "در انتظار پرداخت") : null,
  ].filter(Boolean);

  // مشاهده‌ی انباردار هنگام تحویل — جدا از مشکلی که طرف حساب ادعا کرده،
  // چون هر کدام یک مقصرِ متفاوت را نشان می‌دهد.
  const observations = observationsOf(effect);

  return (
    <div className="flex items-start gap-1.5 min-w-0 text-[11px] leading-5">
      {Icon && (
        <Icon
          className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${ACCENTS[effect.direction] ?? ""}`}
        />
      )}
      <div className="min-w-0">
        <span className={`font-medium ${ACCENTS[effect.direction] ?? ""}`}>
          {side.effectLabels[effect.direction]}
        </span>{" "}
        <span className="tabular-nums font-medium text-card-foreground">
          {value}
        </span>
        {details.length > 0 && (
          <span className="text-muted-foreground"> · {details.join(" · ")}</span>
        )}
        {observations.length > 0 && (
          <div className="text-muted-foreground">
            بازرسی انبار:{" "}
            {observations
              .map(
                (observation) =>
                  `${formatNumber(observation.quantity)} ${
                    RETURN_PROBLEM_LABELS[observation.problem] ??
                    observation.problem
                  }`,
              )
              .join(" · ")}
          </div>
        )}
      </div>
    </div>
  );
}
