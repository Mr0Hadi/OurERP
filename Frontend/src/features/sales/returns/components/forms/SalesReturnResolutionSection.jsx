import { Ban, RotateCcw, Warehouse, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { ROUTES } from "@/shared/constants/routes";

import {
  SALES_RETURN_STATUSES,
  isTerminalStatus,
} from "../../domain/returnVocabulary";
import {
  canCancelSalesReturn,
  canRejectSalesReturn,
  hasPendingGoodsIn,
  hasPendingGoodsOut,
} from "../../domain/returnResolutions";
import ClaimResolutionCard from "./ClaimResolutionCard";

/**
 * فهرست ادعاها و تصمیم‌هایشان.
 *
 * وضعیت و پیشرفت قبلاً اینجا بودند و همراه چند اعلان دیگر، کارت را
 * چهارلایه می‌کردند. حالا آن‌ها بالای صفحه‌اند (SalesReturnStatusBar) و
 * این کارت فقط کارِ اصلی را دارد: ادعاها.
 */
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
  const claims = salesReturn.claims || [];
  const isClosed = isTerminalStatus(status);
  const canReject = canRejectSalesReturn(salesReturn);
  const canCancel = canCancelSalesReturn(salesReturn);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground">
          ادعاها و تصمیم‌ها
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
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

        {(canReject || canCancel) && (
          <div className="flex flex-col sm:flex-row gap-2 border-t border-border pt-3">
            {canReject && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
                disabled={isBusy}
                onClick={onReject}
              >
                <XCircle className="h-4 w-4" />
                رد ادعای مشتری
              </Button>
            )}
            {canCancel && (
              <Button
                type="button"
                variant="outline"
                size="sm"
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
      </CardContent>
    </Card>
  );
}

function WarehouseQueueNotice({ salesReturn }) {
  const navigate = useNavigate();
  const awaitingIntake = hasPendingGoodsIn(salesReturn);
  const awaitingDispatch = hasPendingGoodsOut(salesReturn);

  if (!awaitingIntake && !awaitingDispatch) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20 p-2.5 space-y-2">
      <p className="text-xs font-medium flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
        <Warehouse className="h-3.5 w-3.5 shrink-0" />
        منتظر اقدام انبار
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        {awaitingIntake && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="flex-1 h-8 text-xs"
            onClick={() =>
              navigate(
                ROUTES.WAREHOUSE_RECEIVING_RETURN_DETAIL.replace(
                  ":id",
                  salesReturn.id,
                ),
              )
            }
          >
            دریافت کالا از مشتری
          </Button>
        )}
        {awaitingDispatch && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="flex-1 h-8 text-xs"
            onClick={() =>
              navigate(
                ROUTES.WAREHOUSE_SHIPPING_REPLACEMENT_DETAIL.replace(
                  ":returnId",
                  salesReturn.id,
                ),
              )
            }
          >
            ارسال کالا برای مشتری
          </Button>
        )}
      </div>
    </div>
  );
}
