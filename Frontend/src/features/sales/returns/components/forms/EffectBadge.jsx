import {
  PackageMinus,
  PackagePlus,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import {
  EFFECT_KINDS,
  EFFECT_KIND_LABELS,
  EFFECT_KIND_STYLES,
  EFFECT_STATUSES,
  MONEY_CHANNEL_LABELS,
  isGoodsEffect,
} from "../../domain/returnEffects";

const ICONS = {
  [EFFECT_KINDS.GOODS_IN]: PackagePlus,
  [EFFECT_KINDS.GOODS_OUT]: PackageMinus,
  [EFFECT_KINDS.MONEY_IN]: ArrowDownLeft,
  [EFFECT_KINDS.MONEY_OUT]: ArrowUpRight,
};

/**
 * یک اثر پایه به‌صورت بج.
 *
 * برای اثر کالایی، اگر کالای اثر با کالای ادعا فرق داشته باشد (تعویض
 * با کالای دیگر) نامش هم نشان داده می‌شود — وگرنه کاربر نمی‌فهمد چه
 * چیزی قرار است برود.
 */
export default function EffectBadge({ effect, showProductName = false }) {
  const Icon = ICONS[effect.kind];
  const isGoods = isGoodsEffect(effect.kind);
  const isPending = effect.status === EFFECT_STATUSES.PENDING;

  const value = isGoods
    ? `${(Number(effect.qty) || 0).toLocaleString("fa-IR")} ${effect.unit || "عدد"}`
    : `${(Number(effect.amount) || 0).toLocaleString("fa-IR")} ریال`;

  const progress =
    isGoods && (Number(effect.doneQty) || 0) > 0
      ? ` (${(Number(effect.doneQty) || 0).toLocaleString("fa-IR")} انجام‌شده)`
      : "";

  return (
    <Badge
      variant="outline"
      className={`gap-1 text-[11px] ${EFFECT_KIND_STYLES[effect.kind] ?? ""} ${
        isPending ? "border-dashed" : ""
      }`}
    >
      {Icon && <Icon className="h-3 w-3" />}
      <span>{EFFECT_KIND_LABELS[effect.kind]}</span>
      <span className="tabular-nums font-medium">
        {value}
        {progress}
      </span>
      {showProductName && isGoods && effect.productName && (
        <span className="opacity-70">— {effect.productName}</span>
      )}
      {!isGoods && effect.channel && (
        <span className="opacity-70">({MONEY_CHANNEL_LABELS[effect.channel]})</span>
      )}
      {isPending && <span className="opacity-70">· در انتظار انبار</span>}
    </Badge>
  );
}
