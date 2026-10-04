import { useState } from "react";
import { Link } from "react-router-dom";
import { Ban, RotateCcw, Warehouse, XCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import Notice from "@/shared/components/feedback/Notice";
import { RETURN_STATUSES, isTerminalStatus } from "@/shared/domain/returns/statuses";
import ClaimResolutionCard from "./ClaimResolutionCard";
import ReturnStatusReasonDialog from "./ReturnStatusReasonDialog";

/**
 * ادعاها و تصمیم‌هایشان، و کارهای چرخه‌ی عمرِ مرجوعی (رد، لغو، بازگشایی) —
 * مشترکِ مرجوعیِ خرید و فروش. پیش از این دو کپیِ ۲۳۰ خطی بود که جز
 * واژه‌ها و پیوندهای انبار یکی بودند.
 *
 * وضعیت و پیشرفت بالای صفحه‌اند (`ReturnStatusBar`)؛ این کارت فقط کارِ اصلی را دارد.
 * اینکه کدام کار مجاز است از پرچم‌های خودِ سند می‌آید (`canReject`، `canCancel`،
 * `canReopen`) — همان قاعده‌ای که سرور اجرا می‌کند.
 *
 * @param actions         خروجیِ `use*ReturnActions(returnId)`
 * @param vocabulary      `{ problemLabels, problemStyles, offScopeLabels, rejectLabel }`
 * @param warehouseLinks  `[{ to, label }]` — کارِ انبارِ مانده روی همین مرجوعی؛ خالی یعنی هیچ
 * @param renderClaimReport / quarantineOf  فقط مرجوعیِ خرید (`ClaimResolutionCard`)
 */
export default function ReturnResolutionSection({
  returnDoc,
  side,
  actions,
  vocabulary,
  warehouseLinks = [],
  renderClaimReport,
  quarantineOf,
}) {
  const { status, statusReason, canReject, canCancel, canReopen } = returnDoc;
  const claims = returnDoc.claims || [];
  const isClosed = isTerminalStatus(status);
  const { isBusy } = actions;
  // «reject» | «cancel» | null — هر دو از همان دیالوگِ دلیل می‌گذرند.
  const [reasonAction, setReasonAction] = useState(null);
  const isReject = reasonAction === "reject";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-card-foreground">
          ادعاها و تصمیم‌ها
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isClosed && warehouseLinks.length > 0 && (
          <Notice tone="warning" icon={Warehouse}>
            <div className="space-y-2">
              <p className="font-medium">کالای این مرجوعی منتظرِ انبار است</p>
              <div className="flex flex-col sm:flex-row gap-2">
                {warehouseLinks.map(({ to, label }) => (
                  <Button key={to} asChild size="sm" variant="outline" className="flex-1 h-8 text-xs">
                    <Link to={to}>{label}</Link>
                  </Button>
                ))}
              </div>
            </div>
          </Notice>
        )}

        {status === RETURN_STATUSES.REJECTED && (
          <Notice tone="danger" icon={XCircle}>
            <div className="space-y-2">
              <p>
                این مرجوعی رد شده و تصمیمِ تازه‌ای نمی‌پذیرد.
                {canReopen && " اگر دوباره باید بررسی شود، بازگشایی‌اش کنید."}
              </p>
              <StatusReason reason={statusReason} />
              {canReopen && (
                <Button type="button" size="sm" className="w-full gap-2" disabled={isBusy} onClick={actions.onReopen}>
                  <RotateCcw className="h-4 w-4" />
                  بازگشایی این مرجوعی
                </Button>
              )}
            </div>
          </Notice>
        )}

        {status === RETURN_STATUSES.CANCELLED && (
          <Notice tone="neutral" icon={Ban}>
            <div className="space-y-2">
              <p>این مرجوعی لغو شده است.</p>
              <StatusReason reason={statusReason} />
            </div>
          </Notice>
        )}

        {claims.map((claim) => (
          <ClaimResolutionCard
            key={claim.id}
            claim={claim}
            onAddResolution={actions.onAddResolution}
            onRemoveResolution={actions.onRemoveResolution}
            onExecuteMoney={actions.onExecuteMoney}
            renderReport={renderClaimReport}
            quarantineOf={quarantineOf}
            isBusy={isBusy}
            readOnly={isClosed}
            side={side}
            problemLabels={vocabulary.problemLabels}
            problemStyles={vocabulary.problemStyles}
            offScopeLabels={vocabulary.offScopeLabels}
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
                {vocabulary.rejectLabel}
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
                لغو مرجوعی
              </Button>
            )}
          </div>
        )}

        <ReturnStatusReasonDialog
          open={reasonAction !== null}
          onOpenChange={(open) => !open && setReasonAction(null)}
          title={isReject ? vocabulary.rejectLabel : "لغو مرجوعی"}
          description={
            isReject
              ? "مرجوعی رد می‌شود و تا بازگشایی، تصمیمی روی آن ثبت نمی‌شود."
              : "مرجوعی لغو می‌شود: سابقه‌اش می‌ماند ولی دیگر هیچ کاری (حتی بازگشایی) روی آن ممکن نیست. اگر اشتباهی ثبت شده، حذفش کنید."
          }
          confirmLabel={isReject ? "رد شود" : "لغو شود"}
          isPending={isBusy}
          onConfirm={(reason, close) =>
            (isReject ? actions.onReject : actions.onCancel)(reason, { onSuccess: close })
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
    <p className="whitespace-pre-line rounded-md bg-background/60 px-2.5 py-2 text-card-foreground">
      <span className="text-muted-foreground">دلیل: </span>
      {reason}
    </p>
  );
}
