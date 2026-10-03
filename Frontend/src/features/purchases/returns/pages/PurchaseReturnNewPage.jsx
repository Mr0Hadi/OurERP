import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useGoBack } from "@/shared/hooks/useGoBack";
import { Save, X, AlertCircle } from "lucide-react";

import toast from "react-hot-toast";
import { Button } from "@/shared/components/ui/button";
import { useHeaderStore } from "@/shared/store/headerStore";
import { usePurchaseReturnFormStore } from "../store/purchaseReturnFormStore";
import { usePurchaseReturnForm } from "../hooks/usePurchaseReturnForm";
import {
  usePurchaseForReturnQuery,
  useRelatedPurchaseReturnsQuery,
} from "../services/queries";
import { useCreatePurchaseReturnMutation } from "../services/mutations";

import PurchaseReturnPurchaseSection from "../components/forms/PurchaseReturnPurchaseSection";
import OrderInvoiceCard from "@/shared/components/returns/OrderInvoiceCard";
import { PreviousReturnBadge } from "@/shared/components/returns/ReturnChain";
import ReturnItemsSection from "@/shared/components/returns/ReturnItemsSection";
import ExcessDecisionPanel from "../components/forms/ExcessDecisionPanel";
import { offScopeCapKey } from "../store/purchaseReturnFormStore";
import { useAcceptPurchaseExcessMutation } from "@/features/purchases/orders/services/mutations";
import { useClaimsInOtherReturns } from "@/shared/hooks/useClaimsInOtherReturns";
import ReceivingReportCard, {
  ReceivingReportLines,
} from "@/shared/components/returns/ReceivingReport";
import { claimReceivingReport } from "@/shared/domain/returns/receivingReport";
import {
  PURCHASE_ON_ORDER_PROBLEM_LABELS,
  PURCHASE_OFF_ORDER_PROBLEM_LABELS,
  OFF_SCOPE_KIND_LABELS,
} from "../domain/purchaseReturnVocabulary";
import { OFF_SCOPE_KINDS, OFF_SCOPE_KIND_STYLES } from "@/shared/domain/returns/scopes";
import PurchaseReturnInfoSection from "../components/forms/PurchaseReturnInfoSection";
import PurchaseReturnDetailLoading from "../components/forms/PurchaseReturnDetailLoading";
import { ROUTES } from "@/shared/constants/routes";
import { getErrorMessage } from "@/shared/lib/errorMessage";
import { formatRial } from "@/shared/lib/numberFormat";

/**
 * ثبت مرجوعی به تامین‌کننده — مراحلِ عمودی روی یک صفحه.
 *
 * بالا: فاکتورِ خرید و گزارشِ انبار از دریافتش (چه رسید، چه در قرنطینه است).
 * پایین: مشکل‌هایی که به تامین‌کننده برمی‌گردد، و کنارِ هر کالا تصمیمِ
 *        مازادش — عودت یا نگه‌داشتن و خرید (`ExcessDecisionPanel`).
 * پایین: مشکل‌هایی که به تامین‌کننده برمی‌گردد.
 *
 * ترتیب عمدی است: کاربر اول باید ببیند چه چیزی خریده و چه رسیده، بعد
 * بگوید کدام بخشش مشکل دارد.
 */
export default function PurchaseReturnNewPage() {
  const navigate = useNavigate();
  const goBack = useGoBack();
  const [searchParams] = useSearchParams();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const [selectedPurchaseId, setSelectedPurchaseId] = useState(
    searchParams.get("purchaseId") ? Number(searchParams.get("purchaseId")) : null,
  );
  const [showErrors, setShowErrors] = useState(false);
  // `?prefill=quarantine` — آمده از «ثبت مغایرت» در صفحه‌ی دریافت انبار.
  const prefillQuarantine = searchParams.get("prefill") === "quarantine";

  const { formData, resetForm, initializeForPurchase } = usePurchaseReturnFormStore();
  const {
    setFormData,
    lines,
    orderLines,
    offScopeClaims,
    allClaims,
    handleAddClaim,
    handleUpdateClaim,
    handleRemoveClaim,
    handleAddOffScopeClaim,
    handleUpdateOffScopeClaim,
    handleRemoveOffScopeClaim,
    computedTotal,
    buildPayload,
    excessPurchases,
    setPurchase,
    buildPurchasePayload,
    purchaseError,
    offScopeCaps,
  } = usePurchaseReturnForm();

  const {
    data: purchaseForReturn,
    isLoading,
    isError,
    error,
  } = usePurchaseForReturnQuery(selectedPurchaseId);
  // ادعاهای مرجوعی‌های قبلیِ همین خرید، کنارِ هر کالا.
  const claimsElsewhere = useClaimsInOtherReturns(
    "purchase",
    selectedPurchaseId,
  );

  // `?previousReturnId=` — از «ثبت مرجوعیِ بعدی» روی یک مرجوعیِ تسویه‌شده؛
  // فقط برای همان خریدی که در آدرس آمده، نه خریدی که کاربر بعداً عوض کرد.
  const previousReturnId =
    selectedPurchaseId != null &&
    selectedPurchaseId === Number(searchParams.get("purchaseId"))
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

  useEffect(() => {
    setHeader({
      title: "ثبت مرجوعی به تامین‌کننده",
      showBack: true,
      onBack: () => {
        resetForm();
        goBack();
      },
    });
    return () => clearHeader();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHeader, clearHeader, goBack]);

  const createMutation = useCreatePurchaseReturnMutation();
  const acceptMutation = useAcceptPurchaseExcessMutation(selectedPurchaseId);
  const isBusy = createMutation.isPending || acceptMutation.isPending;
  const hasClaims = allClaims.length > 0;
  const hasPurchases = Object.keys(excessPurchases).length > 0;

  /** مقدارِ ادعاهای عودتِ یک گروهِ مازاد/سفارش‌نداده. */
  const returnedIn = (key) =>
    offScopeClaims
      .filter((claim) => offScopeCapKey(claim.offScopeKind, claim) === key)
      .reduce((sum, claim) => sum + (Number(claim.quantity) || 0), 0);

  const handleSelectPurchase = (purchaseId) => {
    resetForm();
    setSelectedPurchaseId(purchaseId);
  };

  const handleClearPurchase = () => {
    resetForm();
    setSelectedPurchaseId(null);
  };

  /**
   * اول خرید (`AcceptPurchaseExcess`)، بعد مرجوعی — هر کدام اگر چیزی دارد.
   * خریدِ تنها مرجوعی نمی‌سازد و کاربر روی همین صفحه می‌ماند.
   */
  const onSubmit = (e) => {
    e.preventDefault();
    if (!hasClaims && !hasPurchases) {
      setShowErrors(true);
      return;
    }
    if (purchaseError) {
      toast.error(purchaseError);
      return;
    }
    const createReturn = () => {
      if (hasClaims) createMutation.mutate(buildPayload());
    };
    const purchasePayload = buildPurchasePayload();
    if (purchasePayload) {
      acceptMutation.mutate(purchasePayload, {
        onSuccess: () => {
          setFormData({ excessPurchases: {} });
          createReturn();
        },
      });
      return;
    }
    createReturn();
  };

  const handleCancel = () => {
    resetForm();
    navigate(ROUTES.PURCHASES_RETURNS_LIST);
  };

  const isReady = Boolean(selectedPurchaseId && purchaseForReturn && !isLoading);

  return (
    <div className="container max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in zoom-in-95 duration-300">
      <form onSubmit={onSubmit} className="space-y-4">
        {!selectedPurchaseId && (
          <PurchaseReturnPurchaseSection
            selectedPurchase={null}
            onSelect={handleSelectPurchase}
          />
        )}

        {selectedPurchaseId && isLoading && <PurchaseReturnDetailLoading />}

        {selectedPurchaseId && isError && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-border rounded-lg">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="text-sm text-muted-foreground">
              {getErrorMessage(error, "این خرید قابل مرجوع‌کردن نیست")}
            </p>
            <Button type="button" variant="outline" onClick={handleClearPurchase}>
              انتخاب خرید دیگر
            </Button>
          </div>
        )}

        {isReady && (
          <>
            {/* ── بالا: فاکتور خرید ────────────────────────────────── */}
            <PreviousReturnBadge
              id={formData.previousReturnId}
              number={previousReturn?.returnNumber}
              detailRoute={ROUTES.PURCHASES_RETURNS_DETAIL}
            />

            <OrderInvoiceCard
              order={purchaseForReturn}
              partyName={purchaseForReturn.supplierName}
              claimsElsewhere={claimsElsewhere}
              // هر ادعا مقدارِ تحویل‌شده‌ی خودش را کنارش دارد؛ فاکتورِ کامل فقط مرجع است.
              defaultOpen={false}
            />

            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={handleClearPurchase}
              >
                انتخاب خرید دیگر
              </Button>
            </div>

            <ReceivingReportCard receivingInfo={purchaseForReturn} />

            {/* ── پایین: ثبت مشکلات ────────────────────────────────── */}
            <ReturnItemsSection
              lines={lines}
              offScopeClaims={offScopeClaims}
              orderLines={orderLines}
              claimsElsewhere={claimsElsewhere}
              onAddClaim={handleAddClaim}
              onUpdateClaim={handleUpdateClaim}
              onRemoveClaim={handleRemoveClaim}
              onAddOffScope={handleAddOffScopeClaim}
              onUpdateOffScope={handleUpdateOffScopeClaim}
              onRemoveOffScope={handleRemoveOffScopeClaim}
              problemLabels={PURCHASE_ON_ORDER_PROBLEM_LABELS}
              offScopeProblemLabels={PURCHASE_OFF_ORDER_PROBLEM_LABELS}
              kindLabels={OFF_SCOPE_KIND_LABELS}
              kindStyles={OFF_SCOPE_KIND_STYLES}
              renderOffScopeReport={(claim) => (
                <ReceivingReportLines
                  {...claimReceivingReport(purchaseForReturn, claim)}
                />
              )}
              description="برای هر کالا می‌توانید چند مشکل جدا با تعداد جداگانه ثبت کنید. سقف هر کالا مقدارِ رسیده‌ای است که هنوز در مرجوعیِ دیگری ادعا نشده. اگر بیشتر از سفارش رسیده، «مازاد» را روی همان کالا ثبت کنید. کالایی که نرسیده (کسری) مرجوعی ندارد: یا با محموله‌ی بعد می‌رسد، یا قلمش را در صفحه‌ی خرید ببندید."
              emptyText="این سفارش قلمی برای ادعا ندارد"
              unlistedHint="کالایی که سفارش داده نشده ولی رسیده؛ سقفش کالای همان نوع در قرنطینه است."
              priceOf={(product) => product.purchasePrice ?? 0}
              renderExcessPanel={(line, orderLine) => {
                const key = offScopeCapKey(OFF_SCOPE_KINDS.EXCESS, line);
                const free = offScopeCaps[key] ?? 0;
                if (free <= 0) return null;
                return (
                  <ExcessDecisionPanel
                    title="بیش از سفارش رسیده."
                    free={free}
                    returned={returnedIn(key)}
                    bought={excessPurchases[key]?.quantity ?? 0}
                    unitPrice={line.unitPrice}
                    unit={line.unit || "عدد"}
                    onReturn={() => handleAddOffScopeClaim(orderLine, OFF_SCOPE_KINDS.EXCESS)}
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
              }}
              unlistedPanel={(formData.unlistedStock || []).map((product) => {
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
                    onReturn={() =>
                      handleAddOffScopeClaim({ ...product, unitPrice: 0 }, OFF_SCOPE_KINDS.UNLISTED)
                    }
                    onBuyChange={(quantity) => setPurchase(key, group, { quantity })}
                    onPriceChange={(unitPrice) => setPurchase(key, group, { unitPrice })}
                  />
                );
              })}
            />

            <PurchaseReturnInfoSection
              formData={formData}
              onFormChange={setFormData}
            />

            {showErrors && !hasClaims && !hasPurchases && (
              <p className="text-xs text-destructive px-1">
                حداقل یک مشکل یا یک خریدِ مازاد با تعداد بیشتر از صفر لازم است
              </p>
            )}

            {/* چسبان: جمع و دکمه‌ی ثبت با اسکرولِ ادعاها از دید نمی‌روند. */}
            <div className="sticky bottom-0 z-20 -mx-4 sm:mx-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-t sm:border border-border sm:rounded-lg bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 p-3">
              <div className="text-sm">
                <span className="text-muted-foreground">
                  جمع مبلغ ادعای مرجوعی:{" "}
                </span>
                <span className="font-bold text-card-foreground">
                  {formatRial(computedTotal)}
                </span>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="gap-2" disabled={isBusy}>
                  <Save className="h-4 w-4" />
                  {isBusy
                    ? "در حال ثبت..."
                    : hasClaims
                      ? "ثبت مرجوعی به تامین‌کننده"
                      : "ثبتِ خریدِ مازاد"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={handleCancel}
                  disabled={isBusy}
                >
                  <X className="h-4 w-4" />
                  انصراف
                </Button>
              </div>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
