import {
  PackageMinus,
  PackagePlus,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import {
  EFFECT_KINDS,
  EFFECT_STATUSES,
  PAYMENT_METHOD_LABELS,
  isGoodsEffect,
  observationsOf,
} from "@/shared/domain/returns/effects";
import { RETURN_PROBLEM_LABELS } from "@/shared/domain/returns/problems";

const ICONS = {
  [EFFECT_KINDS.GOODS_IN]: PackagePlus,
  [EFFECT_KINDS.GOODS_OUT]: PackageMinus,
  [EFFECT_KINDS.MONEY_IN]: ArrowDownLeft,
  [EFFECT_KINDS.MONEY_OUT]: ArrowUpRight,
};

const ACCENTS = {
  [EFFECT_KINDS.GOODS_IN]: "text-teal-700 dark:text-teal-400",
  [EFFECT_KINDS.GOODS_OUT]: "text-indigo-700 dark:text-indigo-400",
  [EFFECT_KINDS.MONEY_IN]: "text-emerald-700 dark:text-emerald-400",
  [EFFECT_KINDS.MONEY_OUT]: "text-rose-700 dark:text-rose-400",
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
  const Icon = ICONS[effect.kind];
  const isGoods = isGoodsEffect(effect.kind);
  const isPending = effect.status === EFFECT_STATUSES.PENDING;
  const done = Number(effect.doneQty) || 0;

  const value = isGoods
    ? `${(Number(effect.qty) || 0).toLocaleString("fa-IR")} ${effect.unit || "عدد"}`
    : `${(Number(effect.amount) || 0).toLocaleString("fa-IR")} ریال`;

  const restocked = Number(effect.restockedQty) || 0;
  const isIncoming = effect.kind === EFFECT_KINDS.GOODS_IN;

  const details = [
    showProductName && isGoods ? effect.productName : null,
    // روش پرداخت enum عددی است و «نقدی» صفر — بررسیِ صریح لازم است.
    !isGoods && effect.method != null
      ? PAYMENT_METHOD_LABELS[effect.method]
      : null,
    isGoods && done > 0 ? `${done.toLocaleString("fa-IR")} انجام‌شده` : null,
    // برای کالای برگشتی، «انجام شد» و «به موجودی برگشت» یکی نیستند:
    // کالای معیوب تحویل گرفته می‌شود ولی وارد موجودی قابل‌فروش نمی‌شود.
    isIncoming && done > 0 && restocked !== done
      ? `${restocked.toLocaleString("fa-IR")} به موجودی`
      : null,
    isPending ? "در انتظار انبار" : null,
  ].filter(Boolean);

  // مشاهده‌ی انباردار هنگام تحویل — جدا از مشکلی که طرف حساب ادعا کرده،
  // چون هر کدام یک مقصرِ متفاوت را نشان می‌دهد.
  const observations = observationsOf(effect);

  return (
    <div className="flex items-start gap-1.5 min-w-0 text-[11px] leading-5">
      {Icon && (
        <Icon
          className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${ACCENTS[effect.kind] ?? ""}`}
        />
      )}
      <div className="min-w-0">
        <span className={`font-medium ${ACCENTS[effect.kind] ?? ""}`}>
          {side.effectLabels[effect.kind]}
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
                  `${observation.qty.toLocaleString("fa-IR")} ${
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
