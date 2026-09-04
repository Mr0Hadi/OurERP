import { Badge } from "@/shared/components/ui/badge";
import { Badge as StatusChip } from "@/shared/components/ui/badge";
import { isTerminalStatus } from "@/shared/domain/returns/statuses";
import { RETURN_STATUS_STYLES } from "@/shared/domain/returns/statuses";
import { EFFECT_KINDS } from "@/shared/domain/returns/effects";
import {
  claimDecidedQuantity,
  summarizeReturn,
} from "@/shared/domain/returns/resolutions";

const fa = (value) => (Number(value) || 0).toLocaleString("fa-IR");

/**
 * نوارِ بالای صفحه‌ی جزئیات: وضعیت، پیشرفت تصمیم‌گیری، و خالص مالی.
 *
 * این سه قبلاً در سه جای مختلف پخش بودند — وضعیت و پیشرفت داخل کارتِ
 * تصمیم‌گیری، و ارقام مالی در سایدبار. یک‌جا شدنشان هم صفحه را کوتاه‌تر
 * کرد و هم روی موبایل، جایی که سایدبار به ته صفحه می‌افتد، خلاصه‌ی
 * مرجوعی را بالا و در دسترس نگه می‌دارد.
 */
export default function ReturnStatusBar({ returnDoc: salesReturn, statusLabels, side }) {
  const claims = salesReturn.claims || [];
  const totalClaimed = claims.reduce((s, c) => s + (Number(c.quantity) || 0), 0);
  const totalDecided = claims.reduce((s, c) => s + claimDecidedQuantity(c), 0);
  const progress = totalClaimed > 0 ? (totalDecided / totalClaimed) * 100 : 0;

  const money = summarizeReturn(salesReturn);
  const showProgress = !isTerminalStatus(salesReturn.status) && totalClaimed > 0;

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-sm font-medium text-card-foreground">
            {salesReturn.returnNumber}
          </span>
          <StatusChip
            variant="outline"
            className={RETURN_STATUS_STYLES[salesReturn.status] ?? ""}
          >
            {statusLabels[salesReturn.status] ?? salesReturn.status}
          </StatusChip>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          ادعا: {fa(salesReturn.totalClaimedAmount)} ریال
        </span>
      </div>

      {showProgress && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>پیشرفت تصمیم‌گیری</span>
            <span className="tabular-nums font-medium text-card-foreground">
              {fa(totalDecided)} / {fa(totalClaimed)} عدد
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-[oklch(0.50_0.16_152)] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {(money.moneyOut > 0 || money.moneyIn > 0) && (
        <div className="flex flex-wrap gap-1.5 border-t border-border pt-2">
          {money.moneyOut > 0 && (
            <Badge
              variant="outline"
              className="text-[11px] bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-400"
            >
              {side.effectLabels[EFFECT_KINDS.MONEY_OUT]}: {fa(money.moneyOut)} ریال
            </Badge>
          )}
          {money.moneyIn > 0 && (
            <Badge
              variant="outline"
              className="text-[11px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400"
            >
              {side.effectLabels[EFFECT_KINDS.MONEY_IN]}: {fa(money.moneyIn)} ریال
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
