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
} from "../../domain/returnEffects";

const ICONS = {
  [EFFECT_KINDS.GOODS_IN]: PackagePlus,
  [EFFECT_KINDS.GOODS_OUT]: PackageMinus,
  [EFFECT_KINDS.MONEY_IN]: ArrowDownLeft,
  [EFFECT_KINDS.MONEY_OUT]: ArrowUpRight,
};

// برچسبِ کوتاه؛ نسخه‌ی بلند («پس‌گرفتن کالا از مشتری») روی موبایل
// باعث می‌شد بج از عرض کارت بزند بیرون.
const SHORT_LABELS = {
  [EFFECT_KINDS.GOODS_IN]: "پس‌گرفتن",
  [EFFECT_KINDS.GOODS_OUT]: "ارسال",
  [EFFECT_KINDS.MONEY_IN]: "دریافت وجه",
  [EFFECT_KINDS.MONEY_OUT]: "پرداخت وجه",
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
 * قبلاً این یک Badge بود که برچسب و تعداد و نام کالا و روش پرداخت و
 * وضعیت را در یک خطِ نشکستنی کنار هم می‌چید — روی موبایل تا ۳۰۰
 * پیکسل پهن می‌شد و از کارتِ ۲۳۰ پیکسلی می‌زد بیرون. حالا یک سطر است
 * که متنش می‌شکند و بخش‌های فرعی (نام کالا، روش، «در انتظار انبار»)
 * زیرِ خط اول می‌روند.
 */
export default function EffectBadge({ effect, showProductName = false }) {
  const Icon = ICONS[effect.kind];
  const isGoods = isGoodsEffect(effect.kind);
  const isPending = effect.status === EFFECT_STATUSES.PENDING;
  const done = Number(effect.doneQty) || 0;

  const value = isGoods
    ? `${(Number(effect.qty) || 0).toLocaleString("fa-IR")} ${effect.unit || "عدد"}`
    : `${(Number(effect.amount) || 0).toLocaleString("fa-IR")} ریال`;

  const details = [
    showProductName && isGoods ? effect.productName : null,
    !isGoods && effect.method ? PAYMENT_METHOD_LABELS[effect.method] : null,
    isGoods && done > 0
      ? `${done.toLocaleString("fa-IR")} انجام‌شده`
      : null,
    isPending ? "در انتظار انبار" : null,
  ].filter(Boolean);

  return (
    <div className="flex items-start gap-1.5 min-w-0 text-[11px] leading-5">
      {Icon && (
        <Icon className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${ACCENTS[effect.kind] ?? ""}`} />
      )}
      <div className="min-w-0">
        <span className={`font-medium ${ACCENTS[effect.kind] ?? ""}`}>
          {SHORT_LABELS[effect.kind]}
        </span>{" "}
        <span className="tabular-nums font-medium text-card-foreground">
          {value}
        </span>
        {details.length > 0 && (
          <span className="text-muted-foreground"> · {details.join(" · ")}</span>
        )}
      </div>
    </div>
  );
}
