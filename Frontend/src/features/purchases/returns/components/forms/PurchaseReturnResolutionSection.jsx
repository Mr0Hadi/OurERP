import { useState } from "react";
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
  PURCHASE_RETURN_PROBLEM_LABELS,
  PURCHASE_RETURN_PROBLEM_STYLES,
  OFF_SCOPE_KIND_LABELS,
} from "../../domain/purchaseReturnVocabulary";
import { CLAIM_SCOPES } from "@/shared/domain/returns/scopes";
import {
  RETURN_STATUSES,
  isTerminalStatus,
} from "@/shared/domain/returns/statuses";
import { RETURN_SIDES, sideConfig } from "@/shared/domain/returns/sides";
import {
  hasPendingGoodsIn,
  hasPendingGoodsOut,
  hasPendingQuarantineExit,
} from "@/shared/domain/returns/resolutions";
import ClaimResolutionCard from "@/shared/components/returns/ClaimResolutionCard";
import ReturnStatusReasonDialog from "@/shared/components/returns/ReturnStatusReasonDialog";

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
  onExecuteMoney,
  onReject,
  onCancel,
  onReopen,
  isBusy,
  renderClaimReport,
  quarantineOf,
}) {
  const status = purchaseReturn.status;
  const claims = purchaseReturn.claims || [];
  const isClosed = isTerminalStatus(status);
  // پرچم‌ها از همان قاعده‌ای می‌آیند که سرور هنگام اجرا اعمال می‌کند.
  const { canReject, canCancel, canReopen, statusReason } = purchaseReturn;
  // «reject» | «cancel» | null — هر دو از همان دیالوگِ دلیل می‌گذرند.
  const [reasonAction, setReasonAction] = useState(null);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground">
          ادعاها و تصمیم‌ها
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isClosed && <WarehouseQueueNotice purchaseReturn={purchaseReturn} />}

        {status === RETURN_STATUSES.REJECTED && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 space-y-2">
            <p className="text-sm text-muted-foreground">
              این درخواست رد شده است. اگر لازم است دوباره بررسی شود، بازگشایی‌اش
              کنید.
            </p>
            <StatusReason reason={statusReason} />
            {canReopen && (
              <Button
                type="button"
                className="w-full gap-2"
                disabled={isBusy}
                onClick={onReopen}
              >
                <RotateCcw className="h-4 w-4" />
                بازگشایی این مرجوعی
              </Button>
            )}
          </div>
        )}

        {status === RETURN_STATUSES.CANCELLED && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              این درخواست لغو شده است.
            </p>
            <StatusReason reason={statusReason} />
          </div>
        )}

        {claims.map((claim) => (
          <ClaimResolutionCard
            key={claim.id}
            claim={claim}
            onAddResolution={onAddResolution}
            onRemoveResolution={onRemoveResolution}
            onExecuteMoney={onExecuteMoney}
            renderReport={renderClaimReport}
            quarantineOf={quarantineOf}
            isBusy={isBusy}
            readOnly={isClosed}
            side={PURCHASE_SIDE}
            problemLabels={PURCHASE_RETURN_PROBLEM_LABELS}
            problemStyles={PURCHASE_RETURN_PROBLEM_STYLES}
            offScopeLabels={OFF_SCOPE_KIND_LABELS}
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
                onClick={() => setReasonAction("reject")}
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
                onClick={() => setReasonAction("cancel")}
              >
                <Ban className="h-4 w-4" />
                لغو درخواست
              </Button>
            )}
          </div>
        )}

        <ReturnStatusReasonDialog
          open={reasonAction !== null}
          onOpenChange={(open) => !open && setReasonAction(null)}
          title={reasonAction === "reject" ? "رد ادعا" : "لغو درخواست"}
          description={
            reasonAction === "reject"
              ? "درخواست رد می‌شود و تا بازگشایی، تصمیمی روی آن ثبت نمی‌شود."
              : "درخواست لغو می‌شود و دیگر قابل بازگشایی نیست."
          }
          confirmLabel={reasonAction === "reject" ? "رد شود" : "لغو شود"}
          isPending={isBusy}
          onConfirm={(reason, close) =>
            (reasonAction === "reject" ? onReject : onCancel)(reason, {
              onSuccess: close,
            })
          }
        />
      </CardContent>
    </Card>
  );
}

/** دلیلی که هنگامِ رد یا لغو ثبت شده؛ مرجوعی‌های قدیمی دلیلی ندارند. */
function StatusReason({ reason }) {
  if (!reason) return null;
  return (
    <p className="text-sm whitespace-pre-line rounded-md bg-muted/50 px-2.5 py-2">
      <span className="text-muted-foreground">دلیل: </span>
      {reason}
    </p>
  );
}

function WarehouseQueueNotice({ purchaseReturn }) {
  const navigate = useNavigate();
  const awaitingIntake = hasPendingGoodsIn(purchaseReturn);
  // عودت و خروج از قرنطینه هر دو در صفحه‌ی انبارِ همین مرجوعی اجرا می‌شوند.
  const awaitingDispatch =
    hasPendingGoodsOut(purchaseReturn) || hasPendingQuarantineExit(purchaseReturn);

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
                ROUTES.WAREHOUSE_RECEIVING_DETAIL.replace(
                  ":id",
                  purchaseReturn.purchaseId,
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
            عودت / تعیین تکلیف قرنطینه
          </Button>
        )}
      </div>
    </div>
  );
}
