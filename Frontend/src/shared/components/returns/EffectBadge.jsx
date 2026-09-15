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
import { PAYMENT_TYPE_LABELS } from "@/shared/domain/enums/paymentType";
import { RETURN_PROBLEM_LABELS } from "@/shared/domain/returns/problems";

const ICONS = {
  [EFFECT_DIRECTIONS.GOODS_IN]: PackagePlus,
  [EFFECT_DIRECTIONS.GOODS_OUT]: PackageMinus,
  [EFFECT_DIRECTIONS.MONEY_IN]: ArrowDownLeft,
  [EFFECT_DIRECTIONS.MONEY_OUT]: ArrowUpRight,
  [EFFECT_DIRECTIONS.GOODS_RELEASE]: PackageCheck,
  [EFFECT_DIRECTIONS.GOODS_SCRAP]: PackageX,
};

const ACCENTS = {
  [EFFECT_DIRECTIONS.GOODS_IN]: "text-teal-700 dark:text-teal-400",
  [EFFECT_DIRECTIONS.GOODS_OUT]: "text-indigo-700 dark:text-indigo-400",
  [EFFECT_DIRECTIONS.MONEY_IN]: "text-emerald-700 dark:text-emerald-400",
  [EFFECT_DIRECTIONS.MONEY_OUT]: "text-rose-700 dark:text-rose-400",
  [EFFECT_DIRECTIONS.GOODS_RELEASE]: "text-sky-700 dark:text-sky-400",
  [EFFECT_DIRECTIONS.GOODS_SCRAP]: "text-stone-600 dark:text-stone-400",
};

const fa = (value) => (Number(value) || 0).toLocaleString("fa-IR");

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
    ? `${fa(effect.quantity)} ${effect.unit || "عدد"}`
    : `${fa(effect.amount)} ریال`;

  const restocked = Number(effect.restockedQuantity) || 0;
  const isIncoming = effect.direction === EFFECT_DIRECTIONS.GOODS_IN;
  const hasUnitPrice = isTradedGoodsEffect(effect.direction) && effect.unitPrice != null;

  const details = [
    showProductName && isGoods ? effect.productName : null,
    hasUnitPrice ? `هر عدد ${fa(effect.unitPrice)} ریال` : null,
    // روش پرداخت enum عددی است و «نقدی» صفر — بررسیِ صریح لازم است.
    !isGoods && effect.method != null
      ? PAYMENT_TYPE_LABELS[effect.method]
      : null,
    isGoods && done > 0 ? `${fa(done)} انجام‌شده` : null,
    // برای کالای برگشتی، «انجام شد» و «به موجودی برگشت» یکی نیستند:
    // کالای معیوب تحویل گرفته می‌شود ولی وارد موجودی قابل‌فروش نمی‌شود.
    isIncoming && done > 0 && restocked !== done
      ? `${fa(restocked)} به موجودی`
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
                  `${fa(observation.quantity)} ${
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
