import { isTerminalStatus } from "@/shared/domain/returns/statuses";
import StatusBadge from "@/shared/components/status/StatusBadge";
import ReturnStatusBadge from "./ReturnStatusBadge";
import { EFFECT_DIRECTIONS } from "@/shared/domain/returns/effects";
import {
  claimDecidedQuantity,
  summarizeReturn,
} from "@/shared/domain/returns/resolutions";
import { formatNumber, formatRial } from "@/shared/lib/numberFormat";

/**
 * نوارِ بالای صفحه‌ی جزئیات: وضعیت، پیشرفت تصمیم‌گیری، و خالص مالی.
 *
 * هر سه عمداً یک‌جا هستند و نه پخش بین کارتِ تصمیم‌گیری و سایدبار: روی
 * موبایل سایدبار به ته صفحه می‌افتد، و خلاصه‌ی مرجوعی باید بالا و در
 * دسترس بماند.
 */
export default function ReturnStatusBar({ returnDoc, side }) {
  const claims = returnDoc.claims || [];
  const totalClaimed = claims.reduce((s, c) => s + (Number(c.quantity) || 0), 0);
  const totalDecided = claims.reduce((s, c) => s + claimDecidedQuantity(c), 0);
  const progress = totalClaimed > 0 ? (totalDecided / totalClaimed) * 100 : 0;

  const money = summarizeReturn(returnDoc);
  const showProgress = !isTerminalStatus(returnDoc.status) && totalClaimed > 0;

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-sm font-medium text-card-foreground">
            {returnDoc.returnNumber}
          </span>
          <ReturnStatusBadge status={returnDoc.status} side={side} />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          ادعا: {formatRial(returnDoc.totalAmount)}
        </span>
      </div>

      {showProgress && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>پیشرفت تصمیم‌گیری</span>
            <span className="tabular-nums font-medium text-card-foreground">
              {formatNumber(totalDecided)} / {formatNumber(totalClaimed)} عدد
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-success transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {(money.moneyOut > 0 || money.moneyIn > 0) && (
        <div className="flex flex-wrap gap-1.5 border-t border-border pt-2">
          {money.moneyOut > 0 && (
            <StatusBadge tone="danger">
              {side.effectLabels[EFFECT_DIRECTIONS.MONEY_OUT]}: {formatRial(money.moneyOut)}
            </StatusBadge>
          )}
          {money.moneyIn > 0 && (
            <StatusBadge tone="success">
              {side.effectLabels[EFFECT_DIRECTIONS.MONEY_IN]}: {formatRial(money.moneyIn)}
            </StatusBadge>
          )}
        </div>
      )}
    </div>
  );
}
