import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useGoBack } from "@/shared/hooks/useGoBack";
import { Save, X, AlertCircle } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { useHeaderStore } from "@/shared/store/headerStore";
import { usePurchaseReturnFormStore } from "../store/purchaseReturnFormStore";
import { usePurchaseReturnForm } from "../hooks/usePurchaseReturnForm";
import { usePurchaseForReturnQuery } from "../services/queries";
import { useCreatePurchaseReturnMutation } from "../services/mutations";

import PurchaseReturnPurchaseSection from "../components/forms/PurchaseReturnPurchaseSection";
import OrderInvoiceCard from "@/shared/components/returns/OrderInvoiceCard";
import ClaimsSection from "@/shared/components/returns/ClaimsSection";
import OffScopeClaimsSection from "@/shared/components/returns/OffScopeClaimsSection";
import { PURCHASE_RETURN_PROBLEM_LABELS } from "../domain/purchaseReturnVocabulary";
import PurchaseReturnInfoSection from "../components/forms/PurchaseReturnInfoSection";
import PurchaseReturnDetailLoading from "../components/forms/PurchaseReturnDetailLoading";
import { ROUTES } from "@/shared/constants/routes";

/**
 * ثبت مرجوعی به تامین‌کننده — دو مرحله‌ی عمودی روی یک صفحه.
 *
 * بالا: خودِ فاکتور فروش، همان‌طور که مشتری در دست دارد.
 * پایین: مشکل‌هایی که واحد فروش از او می‌شنود.
 *
 * ترتیب عمدی است: کاربر اول باید ببیند چه چیزی فروخته و تحویل شده،
 * بعد بگوید کدام بخشش مشکل دارد. چیدمان قبلی این دو را کنار هم در دو
 * ستون می‌گذاشت و فاکتور به یک کارت خلاصه در سایدبار تقلیل پیدا
 * می‌کرد.
 */
export default function PurchaseReturnNewPage() {
  const navigate = useNavigate();
  const goBack = useGoBack();
  const [searchParams] = useSearchParams();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const [selectedPurchaseId, setSelectedSaleId] = useState(
    searchParams.get("purchaseId") ? Number(searchParams.get("purchaseId")) : null,
  );
  const [showErrors, setShowErrors] = useState(false);

  const { formData, resetForm, initializeForPurchase } = usePurchaseReturnFormStore();
  const {
    setFormData,
    lines,
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
  } = usePurchaseReturnForm();

  const {
    data: purchaseForReturn,
    isLoading,
    isError,
    error,
  } = usePurchaseForReturnQuery(selectedPurchaseId);

  useEffect(() => {
    resetForm();
    return () => resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (purchaseForReturn) initializeForPurchase(purchaseForReturn);
  }, [purchaseForReturn, initializeForPurchase]);

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
  const isBusy = createMutation.isPending;
  const hasClaims = allClaims.length > 0;

  const handleSelectPurchase = (purchaseId) => {
    resetForm();
    setSelectedSaleId(purchaseId);
  };

  const handleClearPurchase = () => {
    resetForm();
    setSelectedSaleId(null);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!hasClaims) {
      setShowErrors(true);
      return;
    }
    createMutation.mutate(buildPayload());
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
          <PurchaseReturnPurchaseSection selectedSale={null} onSelect={handleSelectPurchase} />
        )}

        {selectedPurchaseId && isLoading && <PurchaseReturnDetailLoading />}

        {selectedPurchaseId && isError && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-border rounded-lg">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="text-sm text-muted-foreground">
              {error?.message || "این خرید قابل مرجوع‌کردن نیست"}
            </p>
            <Button type="button" variant="outline" onClick={handleClearPurchase}>
              انتخاب فروش دیگر
            </Button>
          </div>
        )}

        {isReady && (
          <>
            {/* ── بالا: جزئیات فروش ────────────────────────────────── */}
            <OrderInvoiceCard
              order={purchaseForReturn}
              partyName={purchaseForReturn.supplierName}
            />

            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={handleClearPurchase}
              >
                انتخاب سفارش دیگر
              </Button>
            </div>

            {/* ── پایین: ثبت مشکلات ────────────────────────────────── */}
            <ClaimsSection
              lines={lines}
              onAddClaim={handleAddClaim}
              onUpdateClaim={handleUpdateClaim}
              onRemoveClaim={handleRemoveClaim}
              problemLabels={PURCHASE_RETURN_PROBLEM_LABELS}
              title="مشکلات اقلام سفارش"
              description="برای هر کالا می‌توانید چند مشکل جدا با تعداد جداگانه ثبت کنید. سقف هر کالا، همان مقدارِ سفارش‌شده است."
              emptyText="این سفارش قلمی برای ادعا ندارد"
            />

            <OffScopeClaimsSection
              claims={offScopeClaims}
              purchaseItems={purchaseForReturn.items}
              onAdd={handleAddOffScopeClaim}
              onUpdate={handleUpdateOffScopeClaim}
              onRemove={handleRemoveOffScopeClaim}
            />

            <PurchaseReturnInfoSection
              formData={formData}
              onFormChange={setFormData}
            />

            {showErrors && !hasClaims && (
              <p className="text-xs text-destructive px-1">
                حداقل یک مشکل با تعداد بیشتر از صفر باید ثبت شود
              </p>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 p-3">
              <div className="text-sm">
                <span className="text-muted-foreground">
                  جمع مبلغ ادعای مرجوعی:{" "}
                </span>
                <span className="font-bold text-card-foreground">
                  {computedTotal.toLocaleString("fa-IR")} ریال
                </span>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="gap-2" disabled={isBusy}>
                  <Save className="h-4 w-4" />
                  {isBusy ? "در حال ثبت..." : "ثبت مرجوعی به تامین‌کننده"}
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
