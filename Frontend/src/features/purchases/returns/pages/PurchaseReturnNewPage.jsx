import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import { useUpdateGuard } from "@/shared/services/updateSafety";
import { useGoBack } from "@/shared/hooks/useGoBack";
import { usePageHeader } from "@/shared/hooks/usePageHeader";
import { useClaimsInOtherReturns } from "@/shared/hooks/useClaimsInOtherReturns";
import { ROUTES } from "@/shared/constants/routes";
import { PURCHASE_STATUS_LABELS } from "@/shared/domain/enums/purchaseStatus";
import { OFF_SCOPE_KINDS, OFF_SCOPE_KIND_STYLES } from "@/shared/domain/returns/scopes";
import { RETURN_SIDES, sideConfig } from "@/shared/domain/returns/sides";
import { claimReceivingReport } from "@/shared/domain/returns/receivingReport";
import OrderInvoiceCard from "@/shared/components/returns/OrderInvoiceCard";
import ReturnItemsSection from "@/shared/components/returns/ReturnItemsSection";
import ReturnInfoSection from "@/shared/components/returns/ReturnInfoSection";
import ReturnPageSkeleton from "@/shared/components/returns/ReturnPageSkeleton";
import ReturnSourceError from "@/shared/components/returns/ReturnSourceError";
import ReturnSourcePicker from "@/shared/components/returns/ReturnSourcePicker";
import ReturnSubmitBar from "@/shared/components/returns/ReturnSubmitBar";
import ReceivingReportCard, { ReceivingReportLines } from "@/shared/components/returns/ReceivingReport";
import { PreviousReturnBadge } from "@/shared/components/returns/ReturnChain";
import { useAcceptPurchaseExcessMutation } from "@/features/purchases/orders/services/mutations";

import { offScopeCapKey, usePurchaseReturnFormStore } from "../store/purchaseReturnFormStore";
import { usePurchaseReturnForm } from "../hooks/usePurchaseReturnForm";
import {
  usePurchaseForReturnQuery,
  useRelatedPurchaseReturnsQuery,
  useReturnablePurchasesQuery,
} from "../services/queries";
import { useCreatePurchaseReturnMutation } from "../services/mutations";
import ExcessDecisionPanel from "../components/forms/ExcessDecisionPanel";
import {
  PURCHASE_ON_ORDER_PROBLEM_LABELS,
  PURCHASE_OFF_ORDER_PROBLEM_LABELS,
  OFF_SCOPE_KIND_LABELS,
} from "../domain/purchaseReturnVocabulary";

const PURCHASE_SIDE = sideConfig(RETURN_SIDES.PURCHASE);

/**
 * ثبتِ مرجوعی به تامین‌کننده — مراحلِ عمودی روی یک صفحه.
 *
 * بالا: فاکتورِ خرید (بسته) و گزارشِ انبار از دریافتش (چه رسید، چه در قرنطینه است).
 * پایین: مشکل‌هایی که به تامین‌کننده برمی‌گردد، و کنارِ هر کالا تصمیمِ مازادش —
 *        عودت یا نگه‌داشتن و خرید (`ExcessDecisionPanel`).
 *
 * ترتیب عمدی است: کاربر اول می‌بیند چه خریده و چه رسیده، بعد می‌گوید کدام
 * بخشش مشکل دارد.
 */
export default function PurchaseReturnNewPage() {
  const navigate = useNavigate();
  const goBack = useGoBack();
  const [searchParams] = useSearchParams();

  const [selectedPurchaseId, setSelectedPurchaseId] = useState(
    searchParams.get("purchaseId") ? Number(searchParams.get("purchaseId")) : null,
  );
  const [showErrors, setShowErrors] = useState(false);
  // `?prefill=quarantine` — آمده از «ثبت مغایرت» در صفحه‌ی دریافتِ انبار.
  const prefillQuarantine = searchParams.get("prefill") === "quarantine";

  const { formData, resetForm, initializeForPurchase } = usePurchaseReturnFormStore();
  const form = usePurchaseReturnForm();

  const {
    data: purchaseForReturn,
    isLoading,
    isError,
    error,
  } = usePurchaseForReturnQuery(selectedPurchaseId);
  // ادعاهای مرجوعی‌های قبلیِ همین خرید، کنارِ هر کالا.
  const claimsElsewhere = useClaimsInOtherReturns("purchase", selectedPurchaseId);

  // `?previousReturnId=` — از «ثبت مرجوعیِ بعدی» روی یک مرجوعیِ تسویه‌شده؛
  // فقط برای همان خریدی که در آدرس آمده، نه خریدی که کاربر بعداً عوض کرد.
  const previousReturnId =
    selectedPurchaseId != null && selectedPurchaseId === Number(searchParams.get("purchaseId"))
      ? Number(searchParams.get("previousReturnId")) || null
      : null;
  const { data: relatedReturns } = useRelatedPurchaseReturnsQuery(
    previousReturnId ? selectedPurchaseId : null,
  );
  const previousReturn = relatedReturns?.find((ret) => ret.id === previousReturnId);

  useEffect(() => {
    resetForm();
    return () => resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (purchaseForReturn) {
      initializeForPurchase(purchaseForReturn, { prefillQuarantine, previousReturnId });
    }
  }, [purchaseForReturn, initializeForPurchase, prefillQuarantine, previousReturnId]);

  // «بازگشت» پیش‌نویسِ فرم را هم پاک می‌کند.
  usePageHeader({
    title: "ثبت مرجوعی به تامین‌کننده",
    showBack: true,
    onBack: () => {
      resetForm();
      goBack();
    },
  });

  const createMutation = useCreatePurchaseReturnMutation();
  const acceptMutation = useAcceptPurchaseExcessMutation(selectedPurchaseId);
  const isBusy = createMutation.isPending || acceptMutation.isPending;
  const { excessPurchases, offScopeCaps, returnedIn, setPurchase } = form;
  const hasClaims = form.allClaims.length > 0;
  useUpdateGuard({ dirty: hasClaims, busy: isBusy, reason: "مرجوعیِ خرید در حال ثبت یا ذخیره‌نشده است" });
  const hasPurchases = Object.keys(excessPurchases).length > 0;

  const changePurchase = (purchaseId) => {
    resetForm();
    setShowErrors(false);
    setSelectedPurchaseId(purchaseId);
  };

  /**
   * اول خرید (`AcceptPurchaseExcess`)، بعد مرجوعی — هر کدام اگر چیزی دارد.
   * خریدِ تنها مرجوعی نمی‌سازد و کاربر روی همین صفحه می‌ماند (سقف‌ها تازه می‌شوند).
   */
  const onSubmit = (e) => {
    e.preventDefault();
    if (!hasClaims && !hasPurchases) {
      setShowErrors(true);
      return;
    }
    if (form.purchaseError) {
      toast.error(form.purchaseError);
      return;
    }
    const createReturn = () => {
      if (hasClaims) createMutation.mutate(form.buildPayload());
    };
    const purchasePayload = form.buildPurchasePayload();
    if (!purchasePayload) {
      createReturn();
      return;
    }
    acceptMutation.mutate(purchasePayload, {
      onSuccess: () => {
        form.setFormData({ excessPurchases: {} });
        createReturn();
      },
    });
  };

  const handleCancel = () => {
    resetForm();
    navigate(ROUTES.PURCHASES_RETURNS_LIST);
  };

  /** پنلِ «عودت یا خرید» برای مازادِ یک قلم؛ فقط وقتی مازادِ آزادی در قرنطینه هست. */
  const renderExcessPanel = (line, orderLine) => {
    const key = offScopeCapKey(OFF_SCOPE_KINDS.EXCESS, line);
    const free = offScopeCaps[key] ?? 0;
    if (free <= 0) return null;
    return (
      <ExcessDecisionPanel
        title="بیشتر از سفارش رسیده."
        free={free}
        returned={returnedIn(key)}
        bought={excessPurchases[key]?.quantity ?? 0}
        unitPrice={line.unitPrice}
        unit={line.unit || "عدد"}
        onReturn={() => form.handleAddOffScopeClaim(orderLine, OFF_SCOPE_KINDS.EXCESS)}
        onBuyChange={(quantity) =>
          setPurchase(
            key,
            {
              purchaseItemId: line.orderLineId,
              productId: line.productId,
              productName: line.productName,
              unitPrice: line.unitPrice,
            },
            { quantity },
          )
        }
      />
    );
  };

  /** همان پنل برای هر کالای سفارش‌ندادهِ آزاد در قرنطینه؛ قیمتِ خریدش دستی است. */
  const unlistedPanels = (formData.unlistedStock || []).map((product) => {
    const key = offScopeCapKey(OFF_SCOPE_KINDS.UNLISTED, product);
    const group = { ...product, purchaseItemId: null, unitPrice: null };
    return (
      <ExcessDecisionPanel
        key={key}
        title={`${product.productName} (سفارش‌نداده).`}
        free={offScopeCaps[key] ?? 0}
        returned={returnedIn(key)}
        bought={excessPurchases[key]?.quantity ?? 0}
        unitPrice={excessPurchases[key]?.unitPrice ?? null}
        priceEditable
        unit={product.unit || "عدد"}
        onReturn={() => form.handleAddOffScopeClaim({ ...product, unitPrice: 0 }, OFF_SCOPE_KINDS.UNLISTED)}
        onBuyChange={(quantity) => setPurchase(key, group, { quantity })}
        onPriceChange={(unitPrice) => setPurchase(key, group, { unitPrice })}
      />
    );
  });

  const isReady = Boolean(selectedPurchaseId && purchaseForReturn && !isLoading);

  return (
    <div className="container max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in zoom-in-95 duration-300">
      <form onSubmit={onSubmit} className="space-y-4">
        {!selectedPurchaseId && (
          <ReturnSourcePicker
            title="انتخاب فاکتور خرید"
            hint="فقط خریدهایی که چیزی از آن‌ها رسیده، مرجوعی می‌پذیرند."
            useReturnableQuery={useReturnablePurchasesQuery}
            partyKey="supplierName"
            statusLabels={PURCHASE_STATUS_LABELS}
            emptyText="خریدِ دریافت‌شده‌ای برای ثبتِ مرجوعی نیست"
            onSelect={changePurchase}
          />
        )}

        {selectedPurchaseId && isLoading && <ReturnPageSkeleton />}

        {selectedPurchaseId && isError && (
          <ReturnSourceError
            error={error}
            fallback="اطلاعاتِ این خرید خوانده نشد"
            retryLabel="انتخاب خرید دیگر"
            onReset={() => changePurchase(null)}
          />
        )}

        {isReady && (
          <>
            <PreviousReturnBadge
              id={formData.previousReturnId}
              number={previousReturn?.returnNumber}
              detailRoute={ROUTES.PURCHASES_RETURNS_DETAIL}
            />

            <OrderInvoiceCard
              order={purchaseForReturn}
              partyName={purchaseForReturn.supplierName}
              claimsSource={{ side: "purchase", documentId: selectedPurchaseId }}
              // هر ادعا مقدارِ تحویل‌شده‌ی خودش را کنارش دارد؛ فاکتورِ کامل فقط مرجع است.
              defaultOpen={false}
            />

            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => changePurchase(null)}
              >
                انتخاب خرید دیگر
              </Button>
            </div>

            <ReceivingReportCard receivingInfo={purchaseForReturn} />

            <ReturnItemsSection
              lines={form.lines}
              offScopeClaims={form.offScopeClaims}
              orderLines={form.orderLines}
              claimsElsewhere={claimsElsewhere}
              onAddClaim={form.handleAddClaim}
              onUpdateClaim={form.handleUpdateClaim}
              onRemoveClaim={form.handleRemoveClaim}
              onAddOffScope={form.handleAddOffScopeClaim}
              onUpdateOffScope={form.handleUpdateOffScopeClaim}
              onRemoveOffScope={form.handleRemoveOffScopeClaim}
              problemLabels={PURCHASE_ON_ORDER_PROBLEM_LABELS}
              offScopeProblemLabels={PURCHASE_OFF_ORDER_PROBLEM_LABELS}
              kindLabels={OFF_SCOPE_KIND_LABELS}
              kindStyles={OFF_SCOPE_KIND_STYLES}
              renderOffScopeReport={(claim) => (
                <ReceivingReportLines {...claimReceivingReport(purchaseForReturn, claim)} />
              )}
              description="برای هر کالا می‌توانید چند مشکل جدا با تعدادِ جداگانه ثبت کنید. سقفِ هر کالا مقدارِ رسیده‌ای است که هنوز در مرجوعیِ دیگری ادعا نشده. اگر بیشتر از سفارش رسیده، «مازاد» را روی همان کالا ثبت کنید. کالایی که نرسیده (کسری) مرجوعی ندارد: یا با محموله‌ی بعد می‌رسد، یا قلمش را در صفحه‌ی خرید ببندید."
              emptyText="همه‌ی اقلامِ این خرید یا هنوز نرسیده‌اند یا قبلاً کامل در مرجوعی ادعا شده‌اند"
              unlistedHint="کالایی که سفارش داده نشده ولی رسیده؛ سقفش کالای همان نوع در قرنطینه‌ی این خرید است."
              priceOf={PURCHASE_SIDE.priceOf}
              renderExcessPanel={renderExcessPanel}
              unlistedPanel={unlistedPanels}
            />

            <ReturnInfoSection
              formData={formData}
              onFormChange={form.setFormData}
              counterparty={PURCHASE_SIDE.counterparty}
            />

            {showErrors && !hasClaims && !hasPurchases && (
              <p className="text-xs text-destructive px-1">
                دست‌کم یک مشکل، یا یک خریدِ مازاد، با تعدادِ بیشتر از صفر ثبت کنید
              </p>
            )}

            <ReturnSubmitBar
              total={form.computedTotal}
              submitLabel={hasClaims ? "ثبت مرجوعی" : "ثبتِ خریدِ مازاد"}
              isBusy={isBusy}
              onCancel={handleCancel}
            />
          </>
        )}
      </form>
    </div>
  );
}
