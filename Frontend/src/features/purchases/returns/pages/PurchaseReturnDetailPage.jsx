import { useParams, useNavigate } from "react-router-dom";

import {
  usePurchaseReturnQuery,
  usePurchaseForReturnQuery,
  useRelatedPurchaseReturnsQuery,
} from "../services/queries";
import {
  usePurchaseReturnActions,
  useUpdatePurchaseReturnAttachmentsMutation,
} from "../services/mutations";
import {
  OFF_SCOPE_KIND_LABELS,
  PURCHASE_RETURN_PROBLEM_LABELS,
  PURCHASE_RETURN_PROBLEM_STYLES,
} from "../domain/purchaseReturnVocabulary";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { usePageHeader } from "@/shared/hooks/usePageHeader";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { RETURN_STATUSES } from "@/shared/domain/returns/statuses";
import { RETURN_SIDES, sideConfig } from "@/shared/domain/returns/sides";
import {
  hasPendingGoodsIn,
  hasPendingGoodsOut,
  hasPendingQuarantineExit,
} from "@/shared/domain/returns/resolutions";
import {
  claimQuarantinedQuantity,
  claimReceivingReport,
} from "@/shared/domain/returns/receivingReport";
import DetailErrorState from "@/shared/components/feedback/DetailErrorState";
import ReturnPageSkeleton from "@/shared/components/returns/ReturnPageSkeleton";
import ReturnStatusBar from "@/shared/components/returns/ReturnStatusBar";
import ReturnResolutionSection from "@/shared/components/returns/ReturnResolutionSection";
import ReturnDocumentSection from "@/shared/components/returns/ReturnDocumentSection";
import DeleteReturnAction from "@/shared/components/returns/DeleteReturnAction";
import OrderInvoiceCard from "@/shared/components/returns/OrderInvoiceCard";
import RelatedReturnsCard from "@/shared/components/returns/RelatedReturnsCard";
import ReceivingReportCard, { ReceivingReportLines } from "@/shared/components/returns/ReceivingReport";
import { FollowUpReturnAction, PreviousReturnBadge } from "@/shared/components/returns/ReturnChain";

const PURCHASE_SIDE = sideConfig(RETURN_SIDES.PURCHASE);

const VOCABULARY = {
  problemLabels: PURCHASE_RETURN_PROBLEM_LABELS,
  problemStyles: PURCHASE_RETURN_PROBLEM_STYLES,
  offScopeLabels: OFF_SCOPE_KIND_LABELS,
  // «رد» در مرجوعیِ خرید یعنی تامین‌کننده ادعا را نپذیرفت؛ ما فقط ثبتش می‌کنیم.
  rejectLabel: "ثبتِ ردِ تامین‌کننده",
};

/** کارِ انبارِ مانده روی این مرجوعی: دریافتِ جایگزین، و عودت/آزادسازی/اسقاط. */
function warehouseLinksOf(purchaseReturn) {
  const links = [];
  if (hasPendingGoodsIn(purchaseReturn)) {
    // فقط جایگزینِ همین مرجوعی (`?returnId=`)؛ بی آن فرمِ کاملِ دریافتِ خرید باز
    // می‌شد و باقیمانده‌ی سفارش هم «رسیده» پیش‌پر بود.
    links.push({
      to: `${routeWithId(ROUTES.WAREHOUSE_RECEIVING_DETAIL, purchaseReturn.purchaseId)}?returnId=${purchaseReturn.id}`,
      label: "دریافتِ کالای جایگزین",
    });
  }
  // عودت و خروج از قرنطینه هر دو در صفحه‌ی انبارِ همین مرجوعی اجرا می‌شوند.
  if (hasPendingGoodsOut(purchaseReturn) || hasPendingQuarantineExit(purchaseReturn)) {
    links.push({
      to: routeWithId(ROUTES.WAREHOUSE_SHIPPING_RETURN_DETAIL, purchaseReturn.id),
      label: "عودت / تعیین تکلیفِ قرنطینه",
    });
  }
  return links;
}

/**
 * جزئیاتِ مرجوعی به تامین‌کننده — یک ستون، به ترتیبِ کار: خلاصه‌ی وضعیت،
 * فاکتورِ مرجع (بسته)، گزارشِ انبار از دریافت، و بعد ادعاها و تصمیم‌ها.
 */
function PurchaseReturnDetailContent({ purchaseReturn }) {
  const { data: purchase } = usePurchaseForReturnQuery(purchaseReturn.purchaseId);
  const { data: relatedReturns } = useRelatedPurchaseReturnsQuery(
    purchaseReturn.purchaseId,
    purchaseReturn.id,
  );

  const actions = usePurchaseReturnActions(purchaseReturn.id);
  const attachmentsMutation = useUpdatePurchaseReturnAttachmentsMutation(purchaseReturn.id);
  const { can, isError: permissionsUnknown } = usePermission();

  return (
    <div className="container max-w-3xl mx-auto px-4 space-y-3 animate-in fade-in zoom-in-95 duration-300">
      <ReturnStatusBar returnDoc={purchaseReturn} side={PURCHASE_SIDE} />

      <PreviousReturnBadge
        id={purchaseReturn.previousReturnId}
        number={purchaseReturn.previousReturnNumber}
        detailRoute={ROUTES.PURCHASES_RETURNS_DETAIL}
      />

      {purchase && (
        <OrderInvoiceCard
          order={purchase}
          partyName={purchaseReturn.supplierName}
          defaultOpen={false}
          // روی هر کالا، چقدر در مرجوعی‌های دیگرِ همین خرید ثبت شده (فقط با بازکردنِ کارت).
          claimsSource={{ side: "purchase", documentId: purchaseReturn.purchaseId, excludeReturnId: purchaseReturn.id }}
        />
      )}

      <RelatedReturnsCard
        returns={relatedReturns}
        side={PURCHASE_SIDE}
        detailRoute={ROUTES.PURCHASES_RETURNS_DETAIL}
        title="مرجوعی‌های دیگرِ همین خرید"
      />

      {purchaseReturn.description && (
        <p className="text-sm text-muted-foreground whitespace-pre-line rounded-lg border border-border bg-muted/40 p-3">
          {purchaseReturn.description}
        </p>
      )}

      <ReceivingReportCard receivingInfo={purchase} />

      <ReturnResolutionSection
        returnDoc={purchaseReturn}
        side={PURCHASE_SIDE}
        actions={actions}
        vocabulary={VOCABULARY}
        warehouseLinks={warehouseLinksOf(purchaseReturn)}
        renderClaimReport={(claim) => <ReceivingReportLines {...claimReceivingReport(purchase, claim)} />}
        quarantineOf={(claim) => claimQuarantinedQuantity(purchase, claim)}
      />

      {/* سند و پیوست بعد از کارِ اصلیِ صفحه (ادعاها و تصمیم‌ها) می‌آید. */}
      <ReturnDocumentSection
        returnDoc={purchaseReturn}
        mutation={attachmentsMutation}
        canEdit={permissionsUnknown || can("PurchaseReturnCreate")}
        title="مرجوعی خرید"
        // «برگه‌ی مرجوعی به تامین‌کننده» — برای هر مرجوعیِ خرید، همراهِ کالا.
        documentKind="purchaseReturn"
        documentId={purchaseReturn.id}
        serverDocumentName={`برگه-مرجوعی-${purchaseReturn.returnNumber}`}
        attachmentLabel="رسیدِ امضاشده یا عکسِ کالای مرجوعی"
      />

      {purchaseReturn.status === RETURN_STATUSES.SETTLED && (
        <FollowUpReturnAction
          to={`${ROUTES.PURCHASES_RETURNS_NEW}?purchaseId=${purchaseReturn.purchaseId}&previousReturnId=${purchaseReturn.id}`}
          hint="مشکل دوباره پیش آمد — مثلاً کالای جایگزین هم خراب رسید؟ مرجوعیِ تازه‌ای برای همین خرید ثبت کنید که به این یکی وصل است."
        />
      )}

      {purchaseReturn.canDelete && (
        <DeleteReturnAction
          returnNumber={purchaseReturn.returnNumber}
          onDelete={actions.onDelete}
          isPending={actions.isDeleting}
          disabled={actions.isBusy}
        />
      )}
    </div>
  );
}

export default function PurchaseReturnDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    data: purchaseReturn,
    isLoading,
    isError,
    error: loadError,
    refetch: retryLoad,
  } = usePurchaseReturnQuery(Number(id));

  usePageHeader({
    title: isLoading ? "در حال بارگذاری..." : purchaseReturn ? "جزئیات مرجوعی خرید" : "خطا",
    showBack: true,
  });

  if (isLoading) return <ReturnPageSkeleton />;

  if (isError || !purchaseReturn) {
    return (
      <DetailErrorState
        error={loadError}
        notFoundMessage="مرجوعی مورد نظر یافت نشد."
        onRetry={retryLoad}
        onBack={() => navigate(ROUTES.PURCHASES_RETURNS_LIST)}
      />
    );
  }

  return <PurchaseReturnDetailContent key={purchaseReturn.id} purchaseReturn={purchaseReturn} />;
}
