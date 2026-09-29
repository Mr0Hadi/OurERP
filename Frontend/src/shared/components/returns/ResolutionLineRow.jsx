import { useState } from "react";
import { Banknote, Trash2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";
import {
  EFFECT_DIRECTIONS,
  EFFECT_STATUSES,
  isGoodsEffect,
  isPendingMoneyEffect,
  summarizeEffects,
} from "@/shared/domain/returns/effects";
import EffectBadge from "./EffectBadge";

const PENDING_CLASS =
  "text-[10px] bg-warning/10 text-warning border-warning/25";
const DONE_CLASS =
  "text-[10px] bg-success/10 text-success border-success/25";

/**
 * یک تصمیمِ ثبت‌شده روی یک ادعا، به‌همراه اثرهایش.
 *
 * حذف فقط تا وقتی مجاز است که هیچ کالایی جابه‌جا نشده باشد — همان قاعده‌ی
 * `RemoveClaimResolution`. اثر مالیِ اجراشده مانع نیست؛ سرور ردیفِ معکوسش
 * را می‌نویسد.
 *
 * وعده‌ی پرداخت (اثر مالیِ معلق) همین‌جا دکمه‌ی «ثبت پرداخت» دارد: کار
 * مالی است و به صف انبار نمی‌رود.
 *
 * هر دو تأیید می‌خواهند: حذف ممکن است پولِ جابه‌جاشده را برگرداند و ثبتِ
 * پرداخت پولِ واقعی را در دفتر می‌نویسد؛ یک کلیکِ اشتباه نباید هیچ‌کدام را
 * انجام دهد. دیالوگ تا پایانِ درخواست باز می‌ماند و با رفتنِ ردیف (یا اثر)
 * بعد از موفقیت خودش بسته می‌شود.
 */
export default function ResolutionLineRow({
  resolution,
  onRemove,
  onExecuteMoney,
  isBusy,
  side,
}) {
  const effects = resolution.effects || [];
  const summary = summarizeEffects(effects, { includePending: true });

  const hasMovedGoods = effects.some(
    (effect) => isGoodsEffect(effect.direction) && (Number(effect.appliedQuantity) || 0) > 0,
  );
  const awaitsWarehouse = effects.some(
    (effect) =>
      isGoodsEffect(effect.direction) && effect.status === EFFECT_STATUSES.PENDING,
  );
  const pendingMoney = effects.filter(isPendingMoneyEffect);
  const canRemove = Boolean(onRemove) && !hasMovedGoods;
  const hasAppliedMoney = effects.some(
    (effect) => !isGoodsEffect(effect.direction) && effect.status === EFFECT_STATUSES.APPLIED,
  );

  // `{ kind: "remove" }` یا `{ kind: "money", effect }`
  const [confirm, setConfirm] = useState(null);
  // حذفِ موفق خودِ ردیف را می‌برد؛ ثبتِ پرداختِ موفق فقط اثر را از «معلق»
  // بیرون می‌آورد — دیالوگ با همان بسته می‌شود.
  const confirmOpen =
    confirm !== null &&
    (confirm.kind !== "money" || pendingMoney.some((effect) => effect.id === confirm.effect.id));
  const moneyLabelOf = (effect) =>
    `${side.effectLabels[effect.direction]} ${(Number(effect.amount) || 0).toLocaleString("fa-IR")} ریال`;

  const statusBadge = resolution.isWriteOff
    ? { label: "بخشیده شد", className: DONE_CLASS }
    : awaitsWarehouse
      ? { label: "در انتظار انبار", className: PENDING_CLASS }
      : pendingMoney.length > 0
        ? { label: "در انتظار پرداخت", className: PENDING_CLASS }
        : { label: "انجام شد", className: DONE_CLASS };

  return (
    <div className="rounded-md border border-border bg-card px-2.5 py-2 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-card-foreground tabular-nums shrink-0">
            {(Number(resolution.quantity) || 0).toLocaleString("fa-IR")} عدد
          </span>
          {resolution.note && (
            <span className="text-xs text-muted-foreground truncate max-w-full">
              {resolution.note}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="outline" className={statusBadge.className}>
            {statusBadge.label}
          </Badge>
          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={() => setConfirm({ kind: "remove" })}
              disabled={isBusy}
              aria-label="حذف این تصمیم"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {resolution.isWriteOff && (
        <p className="text-[11px] text-muted-foreground">
          این تعداد بدون هیچ جابه‌جایی کالا یا پولی بسته شد.
        </p>
      )}

      {effects.length > 0 && (
        <div className="space-y-0.5">
          {effects.map((effect) => (
            <EffectBadge
              key={effect.id}
              effect={effect}
              side={side}
              showProductName
            />
          ))}
        </div>
      )}

      {onExecuteMoney &&
        pendingMoney.map((effect) => (
          <Button
            key={effect.id}
            type="button"
            size="sm"
            variant="outline"
            className="w-full h-7 text-[11px] gap-1.5"
            disabled={isBusy}
            onClick={() => setConfirm({ kind: "money", effect })}
          >
            <Banknote className="h-3.5 w-3.5" />
            ثبت {moneyLabelOf(effect)} — انجام شد
          </Button>
        ))}

      {summary.netMoney !== 0 && (
        <p className="text-[11px] text-muted-foreground">
          خالص مالی:{" "}
          <span
            className={
              summary.netMoney > 0
                ? "text-success font-medium"
                : "text-destructive font-medium"
            }
          >
            {Math.abs(summary.netMoney).toLocaleString("fa-IR")} ریال{" "}
            {summary.netMoney > 0
              ? side.effectLabels[EFFECT_DIRECTIONS.MONEY_IN]
              : side.effectLabels[EFFECT_DIRECTIONS.MONEY_OUT]}
          </span>
        </p>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm?.kind === "money" ? "ثبت پرداخت" : "حذف این تصمیم"}
        description={
          confirm?.kind === "money"
            ? `«${moneyLabelOf(confirm.effect)}» همین حالا به‌عنوان انجام‌شده ثبت می‌شود. بعد از آن، لغو یا رد این مرجوعی فقط با حذفِ این تصمیم ممکن است.`
            : `تصمیم و اثرهای انجام‌نشده‌اش حذف می‌شوند و این ${(Number(resolution.quantity) || 0).toLocaleString("fa-IR")} عدد دوباره بی‌تصمیم می‌شود.${
                hasAppliedMoney ? " پولی که جابه‌جا شده با یک ردیفِ معکوس در دفتر برگردانده می‌شود." : ""
              }`
        }
        confirmLabel={confirm?.kind === "money" ? "ثبت شود" : "حذف شود"}
        pendingLabel={confirm?.kind === "money" ? "در حال ثبت..." : "در حال حذف..."}
        destructive={confirm?.kind !== "money"}
        isPending={isBusy}
        onConfirm={() =>
          confirm?.kind === "money" ? onExecuteMoney(confirm.effect) : onRemove()
        }
      />
    </div>
  );
}
