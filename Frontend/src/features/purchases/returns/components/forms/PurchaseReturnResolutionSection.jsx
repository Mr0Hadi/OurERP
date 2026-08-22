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
  PURCHASE_RETURN_STATUSES,
  PURCHASE_RETURN_PROBLEM_LABELS,
  PURCHASE_RETURN_PROBLEM_STYLES,
  OFF_ORDER_KIND_LABELS,
  CLAIM_SCOPES,
  isTerminalStatus,
} from "../../domain/purchaseReturnVocabulary";
import { RETURN_SIDES, sideConfig } from "@/shared/domain/returns/sides";
import {
  canCancelReturn,
  canRejectReturn,
  hasPendingGoodsIn,
  hasPendingGoodsOut,
} from "@/shared/domain/returns/resolutions";
import ClaimResolutionCard from "@/shared/components/returns/ClaimResolutionCard";

const PURCHASE_SIDE = sideConfig(RETURN_SIDES.PURCHASE);

/**
 * فهرست ادعاها و تصمیم‌هایشان.
 *
 * وضعیت و پیشرفت قبلاً اینجا بودند و همراه چند اعلان دیگر، کارت را
 * چهارلایه می‌کردند. حالا آن‌ها بالای صفحه‌اند (ReturnStatusBar) و
 * این کارت فقط کارِ اصلی را دارد: ادعاها.
 */
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
  const claims = purchaseReturn.claims || [];
  const isClosed = isTerminalStatus(status);
  const canReject = canRejectReturn(purchaseReturn);
  const canCancel = canCancelReturn(purchaseReturn);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground">
          ادعاها و تصمیم‌ها
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isClosed && <WarehouseQueueNotice purchaseReturn={purchaseReturn} />}

        {status === PURCHASE_RETURN_STATUSES.REJECTED && (
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

        {status === PURCHASE_RETURN_STATUSES.CANCELLED && (
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
            side={PURCHASE_SIDE}
            problemLabels={PURCHASE_RETURN_PROBLEM_LABELS}
            problemStyles={PURCHASE_RETURN_PROBLEM_STYLES}
            offScopeLabels={OFF_ORDER_KIND_LABELS}
            offScopeValue={CLAIM_SCOPES.OFF_ORDER}
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
                رد ادعا
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

function WarehouseQueueNotice({ purchaseReturn }) {
  const navigate = useNavigate();
  const awaitingIntake = hasPendingGoodsIn(purchaseReturn);
  const awaitingDispatch = hasPendingGoodsOut(purchaseReturn);

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
                ROUTES.WAREHOUSE_RECEIVING_PURCHASE_RETURN_DETAIL.replace(
                  ":id",
                  purchaseReturn.id,
                ),
              )
            }
          >
            دریافت کالای جایگزین
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
                ROUTES.WAREHOUSE_SHIPPING_RETURN_DETAIL.replace(
                  ":id",
                  purchaseReturn.id,
                ),
              )
            }
          >
            عودت کالا به تامین‌کننده
          </Button>
        )}
      </div>
    </div>
  );
}
