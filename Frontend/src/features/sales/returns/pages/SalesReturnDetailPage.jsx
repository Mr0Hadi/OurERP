import { useParams, useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";

import {
  useSalesReturnQuery,
  useSaleForReturnQuery,
  useRelatedSalesReturnsQuery,
} from "../services/queries";
import {
  useAddClaimResolutionMutation,
  useRemoveClaimResolutionMutation,
  useRejectSalesReturnMutation,
  useCancelSalesReturnMutation,
  useReopenSalesReturnMutation,
  useRemoveSalesReturnMutation,
  useExecuteMoneyEffectMutation,
  useUpdateSalesReturnAttachmentsMutation,
} from "../services/mutations";
import { usePermission } from "@/features/auth/hooks/usePermission";
import ReturnDocumentSection from "@/shared/components/returns/ReturnDocumentSection";
import UnitsPageLink from "@/features/warehouse/units/components/UnitsPageLink";
import Notice from "@/shared/components/feedback/Notice";
import { formatNumber } from "@/shared/lib/numberFormat";
import { UnitCustodyReasonEnum } from "@/shared/domain/enums/unitStatus";
import { UNIT_SEGMENTS } from "@/features/warehouse/units/domain/unitVocabulary";

import SalesReturnDetailLoading from "../components/forms/SalesReturnDetailLoading";
import ReturnStatusBar from "@/shared/components/returns/ReturnStatusBar";
import {
  FollowUpReturnAction,
  PreviousReturnBadge,
} from "@/shared/components/returns/ReturnChain";
import { RETURN_STATUSES } from "@/shared/domain/returns/statuses";
import { RETURN_SIDES, sideConfig } from "@/shared/domain/returns/sides";
import OrderInvoiceCard from "@/shared/components/returns/OrderInvoiceCard";
import RelatedReturnsCard from "@/shared/components/returns/RelatedReturnsCard";
import { useClaimsInOtherReturns } from "@/shared/hooks/useClaimsInOtherReturns";
import SalesReturnResolutionSection from "../components/forms/SalesReturnResolutionSection";
import { ROUTES } from "@/shared/constants/routes";
import DetailErrorState from "@/shared/components/feedback/DetailErrorState";
import { EFFECT_DIRECTIONS } from "@/shared/domain/returns/effects";
import { usePageHeader } from "@/shared/hooks/usePageHeader";

/**
 * جزئیات یک مرجوعی — یک ستون، به ترتیبِ کاری که کاربر انجام می‌دهد:
 * خلاصه‌ی وضعیت، فاکتورِ مرجع (بسته)، و بعد ادعاها و تصمیم‌ها.
 *
 * چیدمان قبلی دو ستونه بود و روی موبایل سایدبار به ته صفحه می‌افتاد،
 * پس خلاصه‌ی مالی عملاً دیده نمی‌شد. حالا آن اطلاعات در نوار بالا و
 * کنارِ وضعیت است و ستون دوم اصلاً لازم نیست.
 */
function SalesReturnDetailContent({ salesReturn }) {
  // مرجوعیِ خودش از سقف مستثنا می‌شود تا کارت فاکتور، «ادعاشده در
  // مرجوعی دیگر» را درست نشان دهد — نه ادعاهای همین سند را دوباره
  // به‌عنوان «مرجوعیِ دیگر» بشمارد.
  const { data: sale } = useSaleForReturnQuery(
    salesReturn.saleId,
    salesReturn.id,
  );
  const { data: relatedReturns } = useRelatedSalesReturnsQuery(
    salesReturn.saleId,
    salesReturn.id,
  );

  // روی هر کالا، چقدر در مرجوعی‌های دیگرِ همین سند ثبت شده.
  const claimsElsewhere = useClaimsInOtherReturns(
    "sale",
    salesReturn.saleId,
    salesReturn.id,
  );

  const addResolutionMutation = useAddClaimResolutionMutation(salesReturn.id);
  const removeResolutionMutation = useRemoveClaimResolutionMutation(
    salesReturn.id,
  );
  const rejectMutation = useRejectSalesReturnMutation(salesReturn.id);
  const cancelMutation = useCancelSalesReturnMutation(salesReturn.id);
  const reopenMutation = useReopenSalesReturnMutation(salesReturn.id);
  const removeMutation = useRemoveSalesReturnMutation();
  const hasRefund = (salesReturn.claims || []).some((claim) =>
    (claim.resolutions || []).some((resolution) =>
      (resolution.effects || []).some(
        (effect) => effect.direction === EFFECT_DIRECTIONS.MONEY_OUT,
      ),
    ),
  );
  const executeMoneyMutation = useExecuteMoneyEffectMutation();
  const attachmentsMutation = useUpdateSalesReturnAttachmentsMutation(salesReturn.id);
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
        returnDoc={salesReturn}
        side={sideConfig(RETURN_SIDES.SALES)}
      />

      <PreviousReturnBadge
        id={salesReturn.previousReturnId}
        number={salesReturn.previousReturnNumber}
        detailRoute={ROUTES.SALES_RETURNS_DETAIL}
      />

      {sale && (
        <OrderInvoiceCard
          order={sale}
          partyName={salesReturn.customerName}
          defaultOpen={false}
          claimsElsewhere={claimsElsewhere}
        />
      )}

      <RelatedReturnsCard
        returns={relatedReturns}
        side={sideConfig(RETURN_SIDES.SALES)}
        detailRoute={ROUTES.SALES_RETURNS_DETAIL}
        title="مرجوعی‌های دیگر همین فروش"
      />

      {salesReturn.description && (
        <p className="text-sm text-muted-foreground whitespace-pre-line rounded-lg border border-border bg-muted/40 p-3">
          {salesReturn.description}
        </p>
      )}

      {salesReturn.quarantinedQuantity > 0 && (
        <Notice tone="warning">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {formatNumber(salesReturn.quarantinedQuantity)} عدد از کالای معیوبِ این مرجوعی هنوز در قرنطینه است؛
              با مرجوعیِ خرید به تامین‌کننده برمی‌گردد، یا از صفحه‌ی دانه‌ها آزاد یا اسقاط می‌شود.
            </span>
            <UnitsPageLink
              params={{
                segment: UNIT_SEGMENTS.QUARANTINE,
                custodyReason: UnitCustodyReasonEnum.CUSTOMER_RETURN,
                saleId: salesReturn.saleId,
              }}
              label="دانه‌های قرنطینه"
            />
          </div>
        </Notice>
      )}

      <ReturnDocumentSection
        returnDoc={salesReturn}
        mutation={attachmentsMutation}
        canEdit={permissionsUnknown || can("SaleReturnCreate")}
        title="مرجوعی فروش"
        // برگه‌ی طلبکاری فقط برای مرجوعی‌ای ساخته می‌شود که پولی به مشتری
        // برگردانده؛ بدون آن سرور ۴۰۰ می‌دهد و دکمه‌ی چاپ فقط خطا می‌سازد.
        documentKind="saleReturn"
        documentId={hasRefund ? salesReturn.id : null}
        serverDocumentName={`برگه-طلبکاری-${salesReturn.returnNumber}`}
        emptyHint="برگه‌ی طلبکاری (سندِ استرداد وجه) فقط برای مرجوعی‌ای ساخته می‌شود که در تصمیمش پولی به مشتری برگردانده شده باشد."
        attachmentLabel="فاکتور یا رسید مرجوعی برای مشتری"
      />

      <SalesReturnResolutionSection
        salesReturn={salesReturn}
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

      {salesReturn.status === RETURN_STATUSES.SETTLED && (
        <FollowUpReturnAction
          to={`${ROUTES.SALES_RETURNS_NEW}?saleId=${salesReturn.saleId}&previousReturnId=${salesReturn.id}`}
          hint="مشتری دوباره مشکل دارد — مثلاً کالای جایگزین هم معیوب بود؟ مرجوعیِ تازه‌ای برای همین فروش ثبت کنید که به این یکی وصل است."
        />
      )}

      {salesReturn.canDelete && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full gap-2 text-destructive hover:bg-destructive/10"
              disabled={isBusy}
            >
              <Trash2 className="h-4 w-4" />
              حذف کامل این مرجوعی
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>حذف مرجوعی</AlertDialogTitle>
              <AlertDialogDescription>
                این عملیات قابل بازگشت نیست. مرجوعی «{salesReturn.returnNumber}»
                برای همیشه حذف خواهد شد.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>انصراف</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={() => removeMutation.mutate(salesReturn.id)}
              >
                حذف شود
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

export default function SalesReturnDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    data: salesReturn,
    isLoading,
    isError,
    error: loadError,
    refetch: retryLoad,
  } = useSalesReturnQuery(Number(id));

  usePageHeader({
    title: isLoading
      ? "در حال بارگذاری..."
      : salesReturn
        ? "جزئیات مرجوعی"
        : "خطا",
    showBack: true,
  });

  if (isLoading) return <SalesReturnDetailLoading />;

  if (isError || !salesReturn) {
    return (
      <DetailErrorState
        error={loadError}
        notFoundMessage="مرجوعی مورد نظر یافت نشد."
        onRetry={retryLoad}
        onBack={() => navigate(ROUTES.SALES_RETURNS_LIST)}
      />
    );
  }

  return (
    <SalesReturnDetailContent key={salesReturn.id} salesReturn={salesReturn} />
  );
}
