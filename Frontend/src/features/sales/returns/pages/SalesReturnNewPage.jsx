import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useGoBack } from "@/shared/hooks/useGoBack";
import { Save, X, AlertCircle } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { useHeaderStore } from "@/shared/store/headerStore";
import { useSalesReturnFormStore } from "../store/salesReturnFormStore";
import { useSalesReturnForm } from "../hooks/useSalesReturnForm";
import { useSaleForReturnQuery } from "../services/queries";
import { useCreateSalesReturnMutation } from "../services/mutations";

import SalesReturnSaleSection from "../components/forms/SalesReturnSaleSection";
import SaleInvoiceCard from "../components/forms/SaleInvoiceCard";
import SalesReturnClaimsSection from "../components/forms/SalesReturnClaimsSection";
import OffInvoiceClaimsSection from "../components/forms/OffInvoiceClaimsSection";
import SalesReturnInfoSection from "../components/forms/SalesReturnInfoSection";
import SalesReturnDetailLoading from "../components/forms/SalesReturnDetailLoading";
import { ROUTES } from "@/shared/constants/routes";

/**
 * ثبت درخواست مرجوعی — دو مرحله‌ی عمودی روی یک صفحه.
 *
 * بالا: خودِ فاکتور فروش، همان‌طور که مشتری در دست دارد.
 * پایین: مشکل‌هایی که واحد فروش از او می‌شنود.
 *
 * ترتیب عمدی است: کاربر اول باید ببیند چه چیزی فروخته و تحویل شده،
 * بعد بگوید کدام بخشش مشکل دارد. چیدمان قبلی این دو را کنار هم در دو
 * ستون می‌گذاشت و فاکتور به یک کارت خلاصه در سایدبار تقلیل پیدا
 * می‌کرد.
 */
export default function SalesReturnNewPage() {
  const navigate = useNavigate();
  const goBack = useGoBack();
  const [searchParams] = useSearchParams();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const [selectedSaleId, setSelectedSaleId] = useState(
    searchParams.get("saleId") ? Number(searchParams.get("saleId")) : null,
  );
  const [showErrors, setShowErrors] = useState(false);

  const { formData, resetForm, initializeForSale } = useSalesReturnFormStore();
  const {
    setFormData,
    lines,
    offInvoiceClaims,
    allClaims,
    handleAddClaim,
    handleUpdateClaim,
    handleRemoveClaim,
    handleAddOffInvoiceClaim,
    handleUpdateOffInvoiceClaim,
    handleRemoveOffInvoiceClaim,
    computedTotal,
    buildPayload,
  } = useSalesReturnForm();

  const {
    data: saleForReturn,
    isLoading,
    isError,
    error,
  } = useSaleForReturnQuery(selectedSaleId);

  useEffect(() => {
    resetForm();
    return () => resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (saleForReturn) initializeForSale(saleForReturn);
  }, [saleForReturn, initializeForSale]);

  useEffect(() => {
    setHeader({
      title: "ثبت درخواست مرجوعی",
      showBack: true,
      onBack: () => {
        resetForm();
        goBack();
      },
    });
    return () => clearHeader();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHeader, clearHeader, goBack]);

  const createMutation = useCreateSalesReturnMutation();
  const isBusy = createMutation.isPending;
  const hasClaims = allClaims.length > 0;

  const handleSelectSale = (saleId) => {
    resetForm();
    setSelectedSaleId(saleId);
  };

  const handleClearSale = () => {
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
    navigate(ROUTES.SALES_RETURNS_LIST);
  };

  const isReady = Boolean(selectedSaleId && saleForReturn && !isLoading);

  return (
    <div className="container max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in zoom-in-95 duration-300">
      <form onSubmit={onSubmit} className="space-y-4">
        {!selectedSaleId && (
          <SalesReturnSaleSection selectedSale={null} onSelect={handleSelectSale} />
        )}

        {selectedSaleId && isLoading && <SalesReturnDetailLoading />}

        {selectedSaleId && isError && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-border rounded-lg">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <p className="text-sm text-muted-foreground">
              {error?.message || "این فروش قابل مرجوع‌کردن نیست"}
            </p>
            <Button type="button" variant="outline" onClick={handleClearSale}>
              انتخاب فروش دیگر
            </Button>
          </div>
        )}

        {isReady && (
          <>
            {/* ── بالا: جزئیات فروش ────────────────────────────────── */}
            <SaleInvoiceCard sale={saleForReturn} />

            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={handleClearSale}
              >
                انتخاب فاکتور دیگر
              </Button>
            </div>

            {/* ── پایین: ثبت مشکلات ────────────────────────────────── */}
            <SalesReturnClaimsSection
              lines={lines}
              onAddClaim={handleAddClaim}
              onUpdateClaim={handleUpdateClaim}
              onRemoveClaim={handleRemoveClaim}
            />

            <OffInvoiceClaimsSection
              claims={offInvoiceClaims}
              saleItems={saleForReturn.items}
              onAdd={handleAddOffInvoiceClaim}
              onUpdate={handleUpdateOffInvoiceClaim}
              onRemove={handleRemoveOffInvoiceClaim}
            />

            <SalesReturnInfoSection
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
                  {isBusy ? "در حال ثبت..." : "ثبت درخواست مرجوعی"}
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
