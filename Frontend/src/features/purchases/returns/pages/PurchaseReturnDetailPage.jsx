import { useParams, useNavigate } from "react-router-dom";

import {
  usePurchaseReturnQuery,
  usePurchaseForReturnQuery,
  useRelatedPurchaseReturnsQuery,
} from "../services/queries";
import {
  useAddClaimResolutionMutation,
  useRemoveClaimResolutionMutation,
  useRejectPurchaseReturnMutation,
  useCancelPurchaseReturnMutation,
  useReopenPurchaseReturnMutation,
  useRemovePurchaseReturnMutation,
  useExecuteMoneyEffectMutation,
  useUpdatePurchaseReturnAttachmentsMutation,
} from "../services/mutations";
import { usePermission } from "@/features/auth/hooks/usePermission";
import ReturnDocumentSection from "@/shared/components/returns/ReturnDocumentSection";

import PurchaseReturnDetailLoading from "../components/forms/PurchaseReturnDetailLoading";
import ReturnStatusBar from "@/shared/components/returns/ReturnStatusBar";
import DeleteReturnAction from "@/shared/components/returns/DeleteReturnAction";
import {
  FollowUpReturnAction,
  PreviousReturnBadge,
} from "@/shared/components/returns/ReturnChain";
import { RETURN_STATUSES } from "@/shared/domain/returns/statuses";
import { RETURN_SIDES, sideConfig } from "@/shared/domain/returns/sides";
import OrderInvoiceCard from "@/shared/components/returns/OrderInvoiceCard";
import RelatedReturnsCard from "@/shared/components/returns/RelatedReturnsCard";
import { useClaimsInOtherReturns } from "@/shared/hooks/useClaimsInOtherReturns";
import PurchaseReturnResolutionSection from "../components/forms/PurchaseReturnResolutionSection";
import { ROUTES } from "@/shared/constants/routes";
import DetailErrorState from "@/shared/components/feedback/DetailErrorState";
import ReceivingReportCard, {
  ReceivingReportLines,
} from "@/shared/components/returns/ReceivingReport";
import {
  claimQuarantinedQuantity,
  claimReceivingReport,
} from "@/shared/domain/returns/receivingReport";
import { usePageHeader } from "@/shared/hooks/usePageHeader";

/**
 * جزئیات یک مرجوعی — یک ستون، به ترتیبِ کاری که کاربر انجام می‌دهد:
 * خلاصه‌ی وضعیت، فاکتورِ مرجع (بسته)، و بعد ادعاها و تصمیم‌ها.
 *
 * چیدمان قبلی دو ستونه بود و روی موبایل سایدبار به ته صفحه می‌افتاد،
 * پس خلاصه‌ی مالی عملاً دیده نمی‌شد. حالا آن اطلاعات در نوار بالا و
 * کنارِ وضعیت است و ستون دوم اصلاً لازم نیست.
 */
function PurchaseReturnDetailContent({ purchaseReturn }) {
  const { data: sale } = usePurchaseForReturnQuery(purchaseReturn.purchaseId);
  const { data: relatedReturns } = useRelatedPurchaseReturnsQuery(
    purchaseReturn.purchaseId,
    purchaseReturn.id,
  );

  // روی هر کالا، چقدر در مرجوعی‌های دیگرِ همین سند ثبت شده.
  const claimsElsewhere = useClaimsInOtherReturns(
    "purchase",
    purchaseReturn.purchaseId,
    purchaseReturn.id,
  );

  const addResolutionMutation = useAddClaimResolutionMutation(
    purchaseReturn.id,
  );
  const removeResolutionMutation = useRemoveClaimResolutionMutation(
    purchaseReturn.id,
  );
  const rejectMutation = useRejectPurchaseReturnMutation(purchaseReturn.id);
  const cancelMutation = useCancelPurchaseReturnMutation(purchaseReturn.id);
  const reopenMutation = useReopenPurchaseReturnMutation(purchaseReturn.id);
  const removeMutation = useRemovePurchaseReturnMutation();
  const executeMoneyMutation = useExecuteMoneyEffectMutation();
  const attachmentsMutation = useUpdatePurchaseReturnAttachmentsMutation(purchaseReturn.id);
  const { can, isError: permissionsUnknown } = usePermission();

  const isBusy =
    executeMoneyMutation.isPending ||
    addResolutionMutation.isPending ||
    removeResolutionMutation.isPending ||
    rejectMutation.isPending ||
    cancelMutation.isPending ||
    reopenMutation.isPending ||
    removeMutation.isPending;

  return (
    <div className="container max-w-3xl mx-auto px-4 space-y-3 animate-in fade-in zoom-in-95 duration-300">
      <ReturnStatusBar
        returnDoc={purchaseReturn}
        side={sideConfig(RETURN_SIDES.PURCHASE)}
      />

      <PreviousReturnBadge
        id={purchaseReturn.previousReturnId}
        number={purchaseReturn.previousReturnNumber}
        detailRoute={ROUTES.PURCHASES_RETURNS_DETAIL}
      />

      {sale && (
        <OrderInvoiceCard
          order={sale}
          partyName={purchaseReturn.supplierName}
          defaultOpen={false}
          claimsElsewhere={claimsElsewhere}
        />
      )}

      <RelatedReturnsCard
        returns={relatedReturns}
        side={sideConfig(RETURN_SIDES.PURCHASE)}
        detailRoute={ROUTES.PURCHASES_RETURNS_DETAIL}
        title="مرجوعی‌های دیگر همین خرید"
      />

      {purchaseReturn.description && (
        <p className="text-sm text-muted-foreground whitespace-pre-line rounded-lg border border-border bg-muted/40 p-3">
          {purchaseReturn.description}
        </p>
      )}

      <ReceivingReportCard receivingInfo={sale} />

      <PurchaseReturnResolutionSection
        purchaseReturn={purchaseReturn}
        renderClaimReport={(claim) => (
          <ReceivingReportLines {...claimReceivingReport(sale, claim)} />
        )}
        quarantineOf={(claim) => claimQuarantinedQuantity(sale, claim)}
        isBusy={isBusy}
        onAddResolution={(claim, composition) =>
          addResolutionMutation.mutate({ claim, composition })
        }
        onRemoveResolution={(claimId, resolutionId) =>
          removeResolutionMutation.mutate({ claimId, resolutionId })
        }
        onExecuteMoney={(effect) =>
          executeMoneyMutation.mutate({ effectId: effect.id })
        }
        onReject={(reason, options) => rejectMutation.mutate(reason, options)}
        onCancel={(reason, options) => cancelMutation.mutate(reason, options)}
        onReopen={() => reopenMutation.mutate()}
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
          onDelete={() => removeMutation.mutate(purchaseReturn.id)}
          isPending={removeMutation.isPending}
          disabled={isBusy}
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
    title: isLoading
      ? "در حال بارگذاری..."
      : purchaseReturn
        ? "جزئیات مرجوعی"
        : "خطا",
    showBack: true,
  });

  if (isLoading) return <PurchaseReturnDetailLoading />;

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

  return (
    <PurchaseReturnDetailContent key={purchaseReturn.id} purchaseReturn={purchaseReturn} />
  );
}
