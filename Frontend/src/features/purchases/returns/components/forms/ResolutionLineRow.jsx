import {
  Trash2,
  Wallet,
  PackageCheck,
  Undo2,
  Ban,
  PackageMinus,
  HandCoins,
  Gift,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  RESOLUTION_TYPE_LABELS,
  RESOLUTION_LINE_STATUSES,
  RESOLUTION_TYPES,
} from "../../services/mockData";
import { isAmountBearingResolution } from "../../domain/purchaseReturnRules";

const RESOLUTION_TYPE_CONFIG = {
  [RESOLUTION_TYPES.REFUND]: {
    icon: Wallet,
    className:
      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:border-purple-800 dark:text-purple-400",
  },
  [RESOLUTION_TYPES.REPLACEMENT]: {
    icon: PackageCheck,
    className:
      "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:border-orange-800 dark:text-orange-400",
  },
  [RESOLUTION_TYPES.CREDIT]: {
    icon: Undo2,
    className:
      "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-400",
  },
  [RESOLUTION_TYPES.WRITE_OFF]: {
    icon: Ban,
    className: "bg-muted text-muted-foreground border-border",
  },
  [RESOLUTION_TYPES.RETURN_TO_SUPPLIER]: {
    icon: PackageMinus,
    className:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-400",
  },
  [RESOLUTION_TYPES.KEEP_AND_SETTLE]: {
    icon: HandCoins,
    className:
      "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:border-teal-800 dark:text-teal-400",
  },
  [RESOLUTION_TYPES.SUPPLIER_WRITE_OFF]: {
    icon: Gift,
    className:
      "bg-lime-50 text-lime-700 border-lime-200 dark:bg-lime-950/40 dark:border-lime-800 dark:text-lime-400",
  },
};

export default function ResolutionLineRow({ resolution, onRemove, isBusy }) {
  const config = RESOLUTION_TYPE_CONFIG[resolution.type] ?? RESOLUTION_TYPE_CONFIG.write_off;
  const Icon = config.icon;
  const isAwaiting = resolution.status === RESOLUTION_LINE_STATUSES.AWAITING;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-md border border-border bg-card px-2.5 py-2">
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <Badge variant="outline" className={`gap-1 text-[11px] shrink-0 ${config.className}`}>
          <Icon className="h-3 w-3" />
          {RESOLUTION_TYPE_LABELS[resolution.type]}
        </Badge>
        <span className="text-xs font-medium text-card-foreground tabular-nums shrink-0">
          {resolution.qty.toLocaleString("fa-IR")} عدد
        </span>
        {isAmountBearingResolution(resolution.type) && (
          <span className="text-xs text-muted-foreground tabular-nums shrink-0">
            ({(resolution.refundAmount || 0).toLocaleString("fa-IR")} ریال)
          </span>
        )}
        {resolution.note && <span className="text-xs text-muted-foreground truncate max-w-full">{resolution.note}</span>}
      </div>

      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
        {isAwaiting ? (
          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400">
            در انتظار تأیید انبار
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] bg-green-50 text-[oklch(0.50_0.16_152)] border-green-200 dark:bg-green-950/40 dark:border-green-800">
            نهایی شد
          </Badge>
        )}
        {isAwaiting && onRemove && (
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
  );
}
