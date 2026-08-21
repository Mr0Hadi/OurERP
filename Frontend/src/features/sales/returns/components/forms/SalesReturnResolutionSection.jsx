import {
  Clock,
  Loader2,
  Ban,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Warehouse,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { ROUTES } from "@/shared/constants/routes";

import {
  SALES_RETURN_STATUSES,
  SALES_RETURN_STATUS_LABELS,
  SALES_RETURN_STATUS_STYLES,
  isTerminalStatus,
} from "../../domain/returnVocabulary";
import {
  canCancelSalesReturn,
  canRejectSalesReturn,
  claimDecidedQty,
  hasPendingGoodsIn,
  hasPendingGoodsOut,
} from "../../domain/returnResolutions";
import ClaimResolutionCard from "./ClaimResolutionCard";

const STATUS_ICONS = {
  [SALES_RETURN_STATUSES.OPEN]: Clock,
  [SALES_RETURN_STATUSES.IN_PROGRESS]: Loader2,
  [SALES_RETURN_STATUSES.SETTLED]: CheckCircle2,
  [SALES_RETURN_STATUSES.REJECTED]: XCircle,
  [SALES_RETURN_STATUSES.CANCELLED]: Ban,
};

function WarehouseQueueNotice({ salesReturn }) {
  const navigate = useNavigate();
  const awaitingIntake = hasPendingGoodsIn(salesReturn);
  const awaitingDispatch = hasPendingGoodsOut(salesReturn);

  if (!awaitingIntake && !awaitingDispatch) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20 p-3 space-y-2">
      <p className="text-sm font-medium flex items-center gap-2 text-amber-800 dark:text-amber-300">
        <Warehouse className="h-4 w-4" />
        منتظر اقدام انبار
      </p>
      <p className="text-xs text-muted-foreground">
        {awaitingIntake && awaitingDispatch
          ? "بخشی از کالا باید از مشتری پس گرفته شود و بخشی هم برایش ارسال شود."
          : awaitingIntake
            ? "طبق تصمیم‌های ثبت‌شده، کالایی باید از مشتری تحویل گرفته شود."
            : "طبق تصمیم‌های ثبت‌شده، کالایی باید برای مشتری ارسال شود."}
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        {awaitingIntake && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="flex-1 gap-2"
            onClick={() =>
              navigate(
                ROUTES.WAREHOUSE_RECEIVING_RETURN_DETAIL.replace(
                  ":id",
                  salesReturn.id,
                ),
              )
            }
          >
            صفحه‌ی دریافت انبار
          </Button>
        )}
        {awaitingDispatch && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="flex-1 gap-2"
            onClick={() =>
              navigate(
                ROUTES.WAREHOUSE_SHIPPING_REPLACEMENT_DETAIL.replace(
                  ":returnId",
                  salesReturn.id,
                ),
              )
            }
          >
            صفحه‌ی ارسال انبار
          </Button>
        )}
      </div>
    </div>
  );
}

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
  const StatusIcon = STATUS_ICONS[status] ?? Clock;
  const claims = salesReturn.claims || [];

  const totalClaimed = claims.reduce((s, c) => s + (Number(c.qty) || 0), 0);
  const totalDecided = claims.reduce((s, c) => s + claimDecidedQty(c), 0);
  const isClosed = isTerminalStatus(status);
  const progress = totalClaimed > 0 ? (totalDecided / totalClaimed) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground">
          تصمیم‌گیری برای مشتری
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          برای هر ادعا می‌توانید چند تصمیم جدا ثبت کنید — مثلاً بخشی بازگشت وجه
          و بخشی تعویض. هر تصمیم پیش از ثبت، اثرش روی کالا و پول را نشان می‌دهد.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">وضعیت فعلی</span>
          <Badge
            variant="outline"
            className={`gap-1.5 ${SALES_RETURN_STATUS_STYLES[status] ?? ""}`}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            {SALES_RETURN_STATUS_LABELS[status] ?? status}
          </Badge>
        </div>

        {!isClosed && totalClaimed > 0 && (
          <div className="space-y-1.5 border-t border-border pt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>پیشرفت تصمیم‌گیری</span>
              <span className="tabular-nums font-medium text-card-foreground">
                {totalDecided.toLocaleString("fa-IR")} /{" "}
                {totalClaimed.toLocaleString("fa-IR")} عدد
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

        {!isClosed && <WarehouseQueueNotice salesReturn={salesReturn} />}

        {status === SALES_RETURN_STATUSES.REJECTED && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-2">
            <p className="text-sm text-muted-foreground">
              این درخواست رد شده است. اگر لازم است دوباره بررسی شود، بازگشایی‌اش
              کنید.
            </p>
            <Button
              type="button"
              className="w-full gap-2"
              disabled={isBusy}
              onClick={onReopen}
            >
              <RotateCcw className="h-4 w-4" />
              بازگشایی این مرجوعی
            </Button>
          </div>
        )}

        {status === SALES_RETURN_STATUSES.CANCELLED && (
          <p className="text-sm text-muted-foreground">
            این درخواست لغو شده است.
          </p>
        )}

        {claims.length > 0 && (
          <div className="space-y-3 border-t border-border pt-3">
            {claims.map((claim) => (
              <ClaimResolutionCard
                key={claim.id}
                claim={claim}
                onAddResolution={onAddResolution}
                onRemoveResolution={onRemoveResolution}
                isBusy={isBusy}
                readOnly={isClosed}
              />
            ))}
          </div>
        )}

        {(canRejectSalesReturn(salesReturn) ||
          canCancelSalesReturn(salesReturn)) && (
          <div className="flex flex-col sm:flex-row gap-2 border-t border-border pt-3">
            {canRejectSalesReturn(salesReturn) && (
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
            )}
            {canCancelSalesReturn(salesReturn) && (
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
            )}
          </div>
        )}

        {status === SALES_RETURN_STATUSES.SETTLED && (
          <p className="text-xs text-muted-foreground text-center border-t border-border pt-3">
            این مرجوعی به‌طور کامل تسویه شده است.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
