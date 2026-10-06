import { useParams, useNavigate } from "react-router-dom";

import {
  useSalesReturnQuery,
  useSaleForReturnQuery,
  useRelatedSalesReturnsQuery,
} from "../services/queries";
import {
  useSalesReturnActions,
  useUpdateSalesReturnAttachmentsMutation,
} from "../services/mutations";
import {
  OFF_SCOPE_KIND_LABELS,
  SALES_RETURN_PROBLEM_LABELS,
  SALES_RETURN_PROBLEM_STYLES,
} from "../domain/salesReturnVocabulary";
import { usePermission } from "@/features/auth/hooks/usePermission";
import UnitsPageLink from "@/features/warehouse/units/components/UnitsPageLink";
import { UNIT_SEGMENTS } from "@/features/warehouse/units/domain/unitVocabulary";
import { usePageHeader } from "@/shared/hooks/usePageHeader";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { UnitCustodyReasonEnum } from "@/shared/domain/enums/unitStatus";
import { EFFECT_DIRECTIONS } from "@/shared/domain/returns/effects";
import { RETURN_STATUSES } from "@/shared/domain/returns/statuses";
import { RETURN_SIDES, sideConfig } from "@/shared/domain/returns/sides";
import {
  hasEffect,
  hasPendingGoodsIn,
  hasPendingGoodsOut,
} from "@/shared/domain/returns/resolutions";
import { formatNumber } from "@/shared/lib/numberFormat";
import Notice from "@/shared/components/feedback/Notice";
import DetailErrorState from "@/shared/components/feedback/DetailErrorState";
import ReturnPageSkeleton from "@/shared/components/returns/ReturnPageSkeleton";
import ReturnStatusBar from "@/shared/components/returns/ReturnStatusBar";
import ReturnResolutionSection from "@/shared/components/returns/ReturnResolutionSection";
import ReturnDocumentSection from "@/shared/components/returns/ReturnDocumentSection";
import DeleteReturnAction from "@/shared/components/returns/DeleteReturnAction";
import OrderInvoiceCard from "@/shared/components/returns/OrderInvoiceCard";
import RelatedReturnsCard from "@/shared/components/returns/RelatedReturnsCard";
import { FollowUpReturnAction, PreviousReturnBadge } from "@/shared/components/returns/ReturnChain";

const SALES_SIDE = sideConfig(RETURN_SIDES.SALES);

const VOCABULARY = {
  problemLabels: SALES_RETURN_PROBLEM_LABELS,
  problemStyles: SALES_RETURN_PROBLEM_STYLES,
  offScopeLabels: OFF_SCOPE_KIND_LABELS,
  rejectLabel: "ردِ ادعای مشتری",
};

/** کارِ انبارِ مانده روی این مرجوعی: تحویل‌گرفتن از مشتری، و ارسالِ جایگزین. */
function warehouseLinksOf(salesReturn) {
  const links = [];
  if (hasPendingGoodsIn(salesReturn)) {
    links.push({
      to: routeWithId(ROUTES.WAREHOUSE_RECEIVING_RETURN_DETAIL, salesReturn.id),
      label: "تحویل‌گرفتنِ کالا از مشتری",
    });
  }
  if (hasPendingGoodsOut(salesReturn)) {
    // فقط جایگزینِ همین مرجوعی (`?returnId=`)؛ بی آن فرمِ کاملِ ارسالِ فروش باز
    // می‌شد و باقیمانده‌ی فاکتور هم برای ارسال پیش‌پر بود.
    links.push({
      to: `${routeWithId(ROUTES.WAREHOUSE_SHIPPING_DETAIL, salesReturn.saleId)}?returnId=${salesReturn.id}`,
      label: "ارسالِ کالای جایگزین برای مشتری",
    });
  }
  return links;
}

/**
 * جزئیاتِ مرجوعی از فروش — یک ستون، به ترتیبِ کار: خلاصه‌ی وضعیت، فاکتورِ
 * مرجع (بسته)، و بعد ادعاها و تصمیم‌ها.
 */
function SalesReturnDetailContent({ salesReturn }) {
  const { data: sale } = useSaleForReturnQuery(salesReturn.saleId);
  const { data: relatedReturns } = useRelatedSalesReturnsQuery(salesReturn.saleId, salesReturn.id);

  const actions = useSalesReturnActions(salesReturn.id);
  const attachmentsMutation = useUpdateSalesReturnAttachmentsMutation(salesReturn.id);
  const { can, isError: permissionsUnknown } = usePermission();
  // برگه‌ی طلبکاری فقط برای مرجوعی‌ای ساخته می‌شود که پولی به مشتری برگردانده؛
  // بدونِ آن سرور ۴۰۰ می‌دهد و دکمه‌ی چاپ فقط خطا می‌ساخت.
  const hasRefund = hasEffect(salesReturn, EFFECT_DIRECTIONS.MONEY_OUT);

  return (
    <div className="container max-w-3xl mx-auto px-4 space-y-3 animate-in fade-in zoom-in-95 duration-300">
      <ReturnStatusBar returnDoc={salesReturn} side={SALES_SIDE} />

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
          // روی هر کالا، چقدر در مرجوعی‌های دیگرِ همین فروش ثبت شده (فقط با بازکردنِ کارت).
          claimsSource={{ side: "sale", documentId: salesReturn.saleId, excludeReturnId: salesReturn.id }}
        />
      )}

      <RelatedReturnsCard
        returns={relatedReturns}
        side={SALES_SIDE}
        detailRoute={ROUTES.SALES_RETURNS_DETAIL}
        title="مرجوعی‌های دیگرِ همین فروش"
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
              {formatNumber(salesReturn.quarantinedQuantity)} عدد از کالای معیوبِ این مرجوعی در قرنطینه است؛
              یا با مرجوعیِ خرید به تامین‌کننده برمی‌گردد، یا از صفحه‌ی دانه‌ها به موجودی برمی‌گردد یا اسقاط می‌شود.
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

      <ReturnResolutionSection
        returnDoc={salesReturn}
        side={SALES_SIDE}
        actions={actions}
        vocabulary={VOCABULARY}
        warehouseLinks={warehouseLinksOf(salesReturn)}
      />

      {/* سند و پیوست بعد از کارِ اصلیِ صفحه (ادعاها و تصمیم‌ها) می‌آید. */}
      <ReturnDocumentSection
        returnDoc={salesReturn}
        mutation={attachmentsMutation}
        canEdit={permissionsUnknown || can("SaleReturnCreate")}
        title="مرجوعی فروش"
        documentKind="saleReturn"
        documentId={hasRefund ? salesReturn.id : null}
        serverDocumentName={`برگه-طلبکاری-${salesReturn.returnNumber}`}
        emptyHint="برگه‌ی طلبکاری (سندِ استرداد وجه) فقط برای مرجوعی‌ای ساخته می‌شود که در تصمیمش پولی به مشتری برگردانده شده باشد."
        attachmentLabel="فاکتور یا رسید مرجوعی برای مشتری"
      />

      {salesReturn.status === RETURN_STATUSES.SETTLED && (
        <FollowUpReturnAction
          to={`${ROUTES.SALES_RETURNS_NEW}?saleId=${salesReturn.saleId}&previousReturnId=${salesReturn.id}`}
          hint="مشتری دوباره مشکل دارد — مثلاً کالای جایگزین هم معیوب بود؟ مرجوعیِ تازه‌ای برای همین فروش ثبت کنید که به این یکی وصل است."
        />
      )}

      {salesReturn.canDelete && (
        <DeleteReturnAction
          returnNumber={salesReturn.returnNumber}
          onDelete={actions.onDelete}
          isPending={actions.isDeleting}
          disabled={actions.isBusy}
        />
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
    title: isLoading ? "در حال بارگذاری..." : salesReturn ? "جزئیات مرجوعی فروش" : "خطا",
    showBack: true,
  });

  if (isLoading) return <ReturnPageSkeleton />;

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

  return <SalesReturnDetailContent key={salesReturn.id} salesReturn={salesReturn} />;
}
