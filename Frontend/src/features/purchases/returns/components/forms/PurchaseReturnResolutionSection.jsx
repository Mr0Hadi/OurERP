// src/features/purchases/components/forms/PurchaseReturnResolutionSection.jsx
import {
  Clock,
  MessageCircle,
  XCircle,
  Ban,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  PURCHASE_RETURN_STATUSES,
  PURCHASE_RETURN_STATUS_LABELS,
  RESOLUTION_LINE_STATUSES,
} from "../../services/mockData";
import ItemResolutionCard from "./ItemResolutionCard";

const STATUS_CONFIG = {
  [PURCHASE_RETURN_STATUSES.PENDING]: {
    icon: Clock,
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400",
  },
  [PURCHASE_RETURN_STATUSES.COORDINATING]: {
    icon: MessageCircle,
    className:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400",
  },
  [PURCHASE_RETURN_STATUSES.RESOLVED]: {
    icon: CheckCircle2,
    className:
      "bg-green-50 text-[oklch(0.50_0.16_152)] border-green-200 dark:bg-green-950/40 dark:border-green-800",
  },
  [PURCHASE_RETURN_STATUSES.REJECTED]: {
    icon: XCircle,
    className: "bg-destructive/5 text-destructive border-destructive/20",
  },
  [PURCHASE_RETURN_STATUSES.CANCELLED]: {
    icon: Ban,
    className: "bg-muted text-muted-foreground border-border",
  },
};

export default function PurchaseReturnResolutionSection({
  purchaseReturn,
  onAddResolution,
  onRemoveResolution,
  onReject,
  onCancel,
  onReopen,
  isBusy,
}) {
  const status = purchaseReturn.status;
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG[PURCHASE_RETURN_STATUSES.PENDING];
  const StatusIcon = config.icon;
  const items = purchaseReturn.items || [];

  const totalQty = items.reduce((s, i) => s + i.qty, 0);
  const allLines = items.flatMap((i) => i.resolutions || []);
  const allocatedQty = allLines.reduce((s, l) => s + (Number(l.qty) || 0), 0);
  const resolvedQty = allLines
    .filter((l) => l.status === RESOLUTION_LINE_STATUSES.RESOLVED)
    .reduce((s, l) => s + (Number(l.qty) || 0), 0);

  const isReadOnly = [
    PURCHASE_RETURN_STATUSES.RESOLVED,
    PURCHASE_RETURN_STATUSES.CANCELLED,
    PURCHASE_RETURN_STATUSES.REJECTED,
  ].includes(status);

  const canRejectOrCancel = status === PURCHASE_RETURN_STATUSES.PENDING;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground">
          پیگیری و هماهنگی با تامین‌کننده
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">وضعیت فعلی</span>
          <Badge variant="outline" className={`gap-1.5 ${config.className}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {PURCHASE_RETURN_STATUS_LABELS[status] ?? status}
          </Badge>
        </div>

        {totalQty > 0 && (
          <div className="space-y-1.5 border-t border-border pt-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-1">
              <span>پیشرفت تسویه</span>
              <span className="tabular-nums font-medium text-card-foreground">
                {resolvedQty.toLocaleString("fa-IR")} / {totalQty.toLocaleString("fa-IR")} عدد
                نهایی شده
                {allocatedQty > resolvedQty && (
                  <span className="text-amber-600 dark:text-amber-400">
                    {" "}
                    (+{(allocatedQty - resolvedQty).toLocaleString("fa-IR")} در انتظار انبار)
                  </span>
                )}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-[oklch(0.50_0.16_152)] transition-all"
                style={{ width: `${totalQty > 0 ? (resolvedQty / totalQty) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {status === PURCHASE_RETURN_STATUSES.REJECTED && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-2">
            <p className="text-sm text-muted-foreground">
              تامین‌کننده این مرجوعی را رد کرده است. می‌توانید دوباره تلاش کنید یا آن را به همین
              حالت رها کنید.
            </p>
            <Button
              type="button"
              className="w-full gap-2"
              disabled={isBusy}
              onClick={onReopen}
            >
              <RotateCcw className="h-4 w-4" />
              بازگشایی و ادامه هماهنگی
            </Button>
          </div>
        )}

        {status === PURCHASE_RETURN_STATUSES.CANCELLED && (
          <p className="text-sm text-muted-foreground">این مرجوعی لغو شده است.</p>
        )}

        {!isReadOnly && items.length > 0 && (
          <div className="space-y-3 border-t border-border pt-3">
            {items.map((item) => (
              <ItemResolutionCard
                key={item.issueId}
                item={item}
                onAddResolution={onAddResolution}
                onRemoveResolution={onRemoveResolution}
                isBusy={isBusy}
                readOnly={false}
              />
            ))}
          </div>
        )}

        {isReadOnly && status !== PURCHASE_RETURN_STATUSES.CANCELLED && items.length > 0 && (
          <div className="space-y-3 border-t border-border pt-3">
            {items.map((item) => (
              <ItemResolutionCard key={item.issueId} item={item} isBusy={isBusy} readOnly />
            ))}
          </div>
        )}

        {canRejectOrCancel && (
          <div className="flex flex-col sm:flex-row gap-2 border-t border-border pt-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
              disabled={isBusy}
              onClick={onReject}
            >
              <XCircle className="h-4 w-4" />
              رد شد توسط تامین‌کننده
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2 text-muted-foreground"
              disabled={isBusy}
              onClick={onCancel}
            >
              <Ban className="h-4 w-4" />
              لغو مرجوعی
            </Button>
          </div>
        )}

        {status === PURCHASE_RETURN_STATUSES.RESOLVED && (
          <p className="text-xs text-muted-foreground text-center border-t border-border pt-3">
            این مرجوعی به‌طور کامل تسویه شده و قابل تغییر نیست.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
