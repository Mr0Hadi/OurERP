import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Save, X, AlertCircle } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { useHeaderStore } from "@/shared/store/headerStore";
import { useSalesReturnFormStore } from "../store/salesReturnFormStore";
import { useSalesReturnForm } from "../hooks/useSalesReturnForm";
import { useSaleForReturnQuery } from "../services/queries";
import { useCreateSalesReturnMutation } from "../services/mutations";

import SalesReturnSaleSection from "../components/forms/SalesReturnSaleSection";
import SalesReturnItemsSection from "../components/forms/SalesReturnItemsSection";
import SalesReturnInfoSection from "../components/forms/SalesReturnInfoSection";
import SalesReturnDetailLoading from "../components/forms/SalesReturnDetailLoading";
import { ROUTES } from "@/shared/constants/routes";

export default function SalesReturnNewPage() {
  const navigate = useNavigate();
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
    items,
    handleAddClaim,
    handleUpdateClaim,
    handleRemoveClaim,
    selectedItems,
    computedTotal,
    buildPayload,
  } = useSalesReturnForm();

  const { data: saleForReturn, isLoading, isError, error } = useSaleForReturnQuery(selectedSaleId);

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
        navigate(ROUTES.SALES_RETURNS_LIST);
      },
    });
    return () => clearHeader();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHeader, clearHeader, navigate]);

  const createMutation = useCreateSalesReturnMutation();
  const selectedCount = selectedItems.length;

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
    if (selectedCount === 0) {
      setShowErrors(true);
      return;
    }
    createMutation.mutate(buildPayload());
  };

  const handleCancel = () => {
    resetForm();
    navigate(ROUTES.SALES_RETURNS_LIST);
  };

  const isBusy = createMutation.isPending;

  return (
    <div className="container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in zoom-in-95 duration-300">
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
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

            {selectedSaleId && saleForReturn && !isLoading && (
              <SalesReturnItemsSection
                items={items}
                onAddClaim={handleAddClaim}
                onUpdateClaim={handleUpdateClaim}
                onRemoveClaim={handleRemoveClaim}
              />
            )}

            {showErrors && selectedCount === 0 && (
              <p className="text-xs text-destructive px-1">
                حداقل باید برای یک کالا، حداقل یک دلیل با تعداد بیشتر از صفر ثبت شود
              </p>
            )}
          </div>

          <div className="space-y-4">
            {selectedSaleId && saleForReturn && (
              <SalesReturnSaleSection
                selectedSale={{
                  invoiceNumber: saleForReturn.invoiceNumber,
                  customerName: saleForReturn.customerName,
                  invoiceDate: saleForReturn.invoiceDate,
                }}
                onClear={handleClearSale}
              />
            )}

            {selectedSaleId && saleForReturn && (
              <>
                <SalesReturnInfoSection formData={formData} onFormChange={setFormData} />

                <div className="rounded-lg border border-border bg-muted/40 p-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">جمع مبلغ ادعای مرجوعی</span>
                  <span className="font-bold text-card-foreground">
                    {computedTotal.toLocaleString("fa-IR")} ریال
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1 gap-2" disabled={isBusy}>
                    <Save className="h-4 w-4" />
                    {isBusy ? "در حال ثبت..." : "ثبت درخواست مرجوعی"}
                  </Button>
                  <Button type="button" variant="outline" className="gap-2" onClick={handleCancel} disabled={isBusy}>
                    <X className="h-4 w-4" />
                    انصراف
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}