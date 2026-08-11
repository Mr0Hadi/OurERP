import {
  Clock,
  MessageCircle,
  Ban,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ClipboardList,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  SALES_RETURN_STATUSES,
  SALES_RETURN_STATUS_LABELS,
  RESOLUTION_LINE_STATUSES,
} from "../../services/mockData";
import ItemResolutionCard from "./ItemResolutionCard";

const STATUS_CONFIG = {
  [SALES_RETURN_STATUSES.PENDING_INSPECTION]: {
    icon: Clock,
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-400",
  },
  [SALES_RETURN_STATUSES.COORDINATING]: {
    icon: MessageCircle,
    className:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400",
  },
  [SALES_RETURN_STATUSES.RESOLVED]: {
    icon: CheckCircle2,
    className:
      "bg-green-50 text-[oklch(0.50_0.16_152)] border-green-200 dark:bg-green-950/40 dark:border-green-800",
  },
  [SALES_RETURN_STATUSES.REJECTED]: {
    icon: XCircle,
    className: "bg-destructive/5 text-destructive border-destructive/20",
  },
  [SALES_RETURN_STATUSES.CANCELLED]: {
    icon: Ban,
    className: "bg-muted text-muted-foreground border-border",
  },
};

const CLOSED_STATUSES = [
  SALES_RETURN_STATUSES.RESOLVED,
  SALES_RETURN_STATUSES.CANCELLED,
  SALES_RETURN_STATUSES.REJECTED,
];

export default function SalesReturnResolutionSection({
  salesReturn,
  onAddResolution,
  onRemoveResolution,
  onReject,
  onCancel,
  onReopen,
  isBusy,
}) {
  const status = salesReturn.status;
  const config =
    STATUS_CONFIG[status] ??
    STATUS_CONFIG[SALES_RETURN_STATUSES.PENDING_INSPECTION];
  const StatusIcon = config.icon;
  const items = salesReturn.items || [];

  const totalVerifiedQty = items.reduce((s, i) => s + (i.verifiedQty || 0), 0);
  const allLines = items.flatMap((i) => i.resolutions || []);
  const allocatedQty = allLines.reduce((s, l) => s + (Number(l.qty) || 0), 0);
  const resolvedQty = allLines
    .filter((l) => l.status === RESOLUTION_LINE_STATUSES.RESOLVED)
    .reduce((s, l) => s + (Number(l.qty) || 0), 0);

  const isReadOnly = CLOSED_STATUSES.includes(status);
  const hasAnyVerified = items.some((i) => (i.verifiedQty || 0) > 0);
  const stillAwaitingMore = items.some(
    (i) => (i.verifiedQty || 0) < i.claimedQty,
  );
  const canRejectOrCancel =
    status === SALES_RETURN_STATUSES.PENDING_INSPECTION && !hasAnyVerified;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground">
          تصمیم‌گیری برای مشتری
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">وضعیت فعلی</span>
          <Badge variant="outline" className={`gap-1.5 ${config.className}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {SALES_RETURN_STATUS_LABELS[status] ?? status}
          </Badge>
        </div>

        {status === SALES_RETURN_STATUSES.PENDING_INSPECTION &&
          stillAwaitingMore &&
          salesReturn.transporterName && (
            <div className="flex items-start gap-2 rounded-lg bg-muted/50 border border-border px-2.5 py-2 text-xs">
              <ClipboardList className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-muted-foreground">
                تا اینجا از{" "}
                <span className="text-card-foreground font-medium">
                  {salesReturn.transporterName}
                </span>{" "}
                دریافت شده؛ بخش دیگری از این مرجوعی هنوز نرسیده و باید هر وقت
                رسید از صفحه‌ی «انبار ← دریافت کالا» ثبت شود.
              </span>
            </div>
          )}

        {totalVerifiedQty > 0 && (
          <div className="space-y-1.5 border-t border-border pt-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-1">
              <span>پیشرفت تسویه‌ی بخش رسیده</span>
              <span className="tabular-nums font-medium text-card-foreground">
                {resolvedQty.toLocaleString("fa-IR")} /{" "}
                {totalVerifiedQty.toLocaleString("fa-IR")} عدد نهایی شده
                {allocatedQty > resolvedQty && (
                  <span className="text-amber-600 dark:text-amber-400">
                    {" "}
                    (+{(allocatedQty - resolvedQty).toLocaleString("fa-IR")} در
                    صف ارسال انبار)
                  </span>
                )}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-[oklch(0.50_0.16_152)] transition-all"
                style={{
                  width: `${totalVerifiedQty > 0 ? (resolvedQty / totalVerifiedQty) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}

        {status === SALES_RETURN_STATUSES.PENDING_INSPECTION &&
          !hasAnyVerified && (
            <p className="text-sm text-muted-foreground border-t border-border pt-3">
              تصمیم‌گیری برای این مرجوعی، پس از ثبت نتیجه‌ی بررسی فیزیکی توسط
              انبار (از صفحه‌ی «انبار ← دریافت کالا») فعال می‌شود.
            </p>
          )}

        {status === SALES_RETURN_STATUSES.REJECTED && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-2">
            <p className="text-sm text-muted-foreground">
              این درخواست رد شده است. اگر لازم است دوباره بررسی شود، آن را
              بازگشایی کنید.
            </p>
            <Button
              type="button"
              className="w-full gap-2"
              disabled={isBusy}
              onClick={onReopen}
            >
              <RotateCcw className="h-4 w-4" />
              بازگشایی و ارسال به بررسی انبار
            </Button>
          </div>
        )}

        {status === SALES_RETURN_STATUSES.CANCELLED && (
          <p className="text-sm text-muted-foreground">
            این درخواست لغو شده است.
          </p>
        )}

        {!isReadOnly && hasAnyVerified && (
          <div className="space-y-3 border-t border-border pt-3">
            {items
              .filter((i) => (i.verifiedQty || 0) > 0)
              .map((item) => (
                <ItemResolutionCard
                  key={item.lineId}
                  item={item}
                  onAddResolution={onAddResolution}
                  onRemoveResolution={onRemoveResolution}
                  isBusy={isBusy}
                  readOnly={false}
                />
              ))}
          </div>
        )}

        {isReadOnly &&
          status !== SALES_RETURN_STATUSES.CANCELLED &&
          status !== SALES_RETURN_STATUSES.REJECTED &&
          items.length > 0 && (
            <div className="space-y-3 border-t border-border pt-3">
              {items.map((item) => (
                <ItemResolutionCard
                  key={item.lineId}
                  item={item}
                  isBusy={isBusy}
                  readOnly
                />
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
              رد ادعای مشتری
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2 text-muted-foreground"
              disabled={isBusy}
              onClick={onCancel}
            >
              <Ban className="h-4 w-4" />
              لغو درخواست
            </Button>
          </div>
        )}

        {status === SALES_RETURN_STATUSES.RESOLVED && (
          <p className="text-xs text-muted-foreground text-center border-t border-border pt-3">
            این مرجوعی به‌طور کامل تسویه شده و قابل تغییر نیست.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
