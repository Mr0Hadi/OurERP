import { Trash2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  EFFECT_STATUSES,
  isGoodsEffect,
  summarizeEffects,
} from "../../domain/returnEffects";
import EffectBadge from "./EffectBadge";

/**
 * یک تصمیمِ ثبت‌شده روی یک ادعا، به‌همراه اثرهایش.
 *
 * حذف فقط تا وقتی مجاز است که هیچ کالایی جابه‌جا نشده باشد. اثرهای
 * پولی مانع حذف نیستند چون با یک تعدیل معکوس برگشت می‌خورند — ولی
 * کالایی که از انبار خارج یا وارد شده برگشت‌پذیر نیست.
 */
export default function ResolutionLineRow({ resolution, onRemove, isBusy }) {
  const effects = resolution.effects || [];
  const summary = summarizeEffects(effects, { includePending: true });

  const hasMovedGoods = effects.some(
    (effect) => isGoodsEffect(effect.kind) && (Number(effect.doneQty) || 0) > 0,
  );
  const isPending = effects.some(
    (effect) => effect.status === EFFECT_STATUSES.PENDING,
  );
  const canRemove = Boolean(onRemove) && !hasMovedGoods;

  return (
    <div className="rounded-md border border-border bg-card px-2.5 py-2 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-card-foreground tabular-nums shrink-0">
            {(Number(resolution.qty) || 0).toLocaleString("fa-IR")} عدد
          </span>
          {resolution.note && (
            <span className="text-xs text-muted-foreground truncate max-w-full">
              {resolution.note}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Badge
            variant="outline"
            className={
              isPending
                ? "text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400"
                : "text-[10px] bg-green-50 text-[oklch(0.50_0.16_152)] border-green-200 dark:bg-green-950/40 dark:border-green-800"
            }
          >
            {isPending ? "در انتظار انبار" : "انجام شد"}
          </Badge>
          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={onRemove}
              disabled={isBusy}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {effects.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {effects.map((effect) => (
            <EffectBadge key={effect.id} effect={effect} showProductName />
          ))}
        </div>
      )}

      {summary.netMoney !== 0 && (
        <p className="text-[11px] text-muted-foreground">
          خالص مالی:{" "}
          <span
            className={
              summary.netMoney > 0
                ? "text-[oklch(0.50_0.16_152)] font-medium"
                : "text-destructive font-medium"
            }
          >
            {Math.abs(summary.netMoney).toLocaleString("fa-IR")} ریال{" "}
            {summary.netMoney > 0 ? "دریافتی از مشتری" : "پرداختی به مشتری"}
          </span>
        </p>
      )}
    </div>
  );
}
