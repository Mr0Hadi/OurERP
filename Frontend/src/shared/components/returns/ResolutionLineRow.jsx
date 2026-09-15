import { Banknote, Trash2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import {
  EFFECT_DIRECTIONS,
  EFFECT_STATUSES,
  isGoodsEffect,
  isPendingMoneyEffect,
  summarizeEffects,
} from "@/shared/domain/returns/effects";
import EffectBadge from "./EffectBadge";

const PENDING_CLASS =
  "text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400";
const DONE_CLASS =
  "text-[10px] bg-green-50 text-[oklch(0.50_0.16_152)] border-green-200 dark:bg-green-950/40 dark:border-green-800";

/**
 * یک تصمیمِ ثبت‌شده روی یک ادعا، به‌همراه اثرهایش.
 *
 * حذف فقط تا وقتی مجاز است که هیچ کالایی جابه‌جا نشده باشد — همان قاعده‌ی
 * `RemoveClaimResolution`. اثر مالیِ اجراشده مانع نیست؛ سرور ردیفِ معکوسش
 * را می‌نویسد.
 *
 * وعده‌ی پرداخت (اثر مالیِ معلق) همین‌جا دکمه‌ی «ثبت پرداخت» دارد: کار
 * مالی است و به صف انبار نمی‌رود.
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
              onClick={onRemove}
              disabled={isBusy}
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

      {/* ثبتِ پرداخت پولِ واقعی را در دفتر می‌نویسد و قفلِ لغو/رد را روشن
          می‌کند؛ یک کلیکِ اشتباه نباید آن را ثبت کند. */}
      {onExecuteMoney &&
        pendingMoney.map((effect) => {
          const label = `${side.effectLabels[effect.direction]} ${(Number(effect.amount) || 0).toLocaleString("fa-IR")} ریال`;
          return (
            <AlertDialog key={effect.id}>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-[11px] gap-1.5"
                  disabled={isBusy}
                >
                  <Banknote className="h-3.5 w-3.5" />
                  ثبت {label} — انجام شد
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ثبت پرداخت</AlertDialogTitle>
                  <AlertDialogDescription>
                    «{label}» همین حالا به‌عنوان انجام‌شده ثبت می‌شود. بعد از آن،
                    لغو یا رد این مرجوعی فقط با حذفِ این تصمیم ممکن است.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>انصراف</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onExecuteMoney(effect)}>
                    تأیید
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          );
        })}

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
            {summary.netMoney > 0
              ? side.effectLabels[EFFECT_DIRECTIONS.MONEY_IN]
              : side.effectLabels[EFFECT_DIRECTIONS.MONEY_OUT]}
          </span>
        </p>
      )}
    </div>
  );
}
