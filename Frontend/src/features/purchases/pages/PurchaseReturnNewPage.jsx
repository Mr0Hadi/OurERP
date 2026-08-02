// src/features/purchases/pages/PurchaseReturnNewPage.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Save, X, AlertCircle } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { useHeaderStore } from "@/shared/store/headerStore";
import { usePurchaseReturnFormStore } from "../store/purchaseReturnFormStore";
import { usePurchaseReturnForm } from "../hooks/usePurchaseReturnForm";
import { useShortageReportByPurchaseIdQuery } from "../services/returns/queries";
import { useCreatePurchaseReturnMutation } from "../services/returns/mutations";

import PurchaseReturnWarehouseReportSection from "../components/forms/PurchaseReturnWarehouseReportSection";
import PurchaseReturnItemsSection from "../components/forms/PurchaseReturnItemsSection";
import PurchaseReturnInfoSection from "../components/forms/PurchaseReturnInfoSection";
import PurchaseReturnDetailLoading from "../components/forms/PurchaseReturnDetailLoading";
import { ROUTES } from "@/shared/constants/routes";

export default function PurchaseReturnNewPage() {
  const navigate = useNavigate();
  const { purchaseId } = useParams();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const { formData, resetForm, initializeForReport } = usePurchaseReturnFormStore();
  const {
    setFormData,
    items,
    selectedItems,
    handleAddClaim,
    handleUpdateClaim,
    handleRemoveClaim,
    computedTotal,
    buildPayload,
  } = usePurchaseReturnForm();

  const [showErrors, setShowErrors] = useState(false);

  const {
    data: report,
    isLoading,
    isError,
    error,
  } = useShortageReportByPurchaseIdQuery(purchaseId);

  useEffect(() => {
    resetForm();
    return () => resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (report) {
      initializeForReport(report);
    }
  }, [report, initializeForReport]);

  useEffect(() => {
    setHeader({
      title: "ثبت مرجوعی به تامین‌کننده",
      showBack: true,
      onBack: () => {
        resetForm();
        navigate(ROUTES.PURCHASES_RETURNS_LIST);
      },
    });
    return () => clearHeader();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHeader, clearHeader, navigate]);

  const createMutation = useCreatePurchaseReturnMutation();
  const selectedCount = selectedItems.length;

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
    navigate(ROUTES.PURCHASES_RETURNS_LIST);
  };

  if (isLoading) return <PurchaseReturnDetailLoading />;

  if (isError || !report) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-muted-foreground">
          {error?.message || "این خرید دیگر کسری قابل پیگیری ندارد."}
        </p>
        <Button variant="outline" onClick={() => navigate(ROUTES.PURCHASES_RETURNS_LIST)}>
          بازگشت به گزارش‌های کسری
        </Button>
      </div>
    );
  }

  const isBusy = createMutation.isPending;

  return (
    <div className="container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in zoom-in-95 duration-300">
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <PurchaseReturnWarehouseReportSection report={report} />

            <PurchaseReturnItemsSection
              items={items}
              onAddClaim={handleAddClaim}
              onUpdateClaim={handleUpdateClaim}
              onRemoveClaim={handleRemoveClaim}
            />

            {showErrors && selectedCount === 0 && (
              <p className="text-xs text-destructive px-1">
                حداقل باید برای یک کالا، حداقل یک دلیل با تعداد بیشتر از صفر ثبت شود
              </p>
            )}
          </div>

          <div className="space-y-4">
            <PurchaseReturnInfoSection formData={formData} onFormChange={setFormData} />

            <div className="rounded-lg border border-border bg-muted/40 p-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">جمع مبلغ مرجوعی</span>
              <span className="font-bold text-card-foreground">
                {computedTotal.toLocaleString("fa-IR")} ریال
              </span>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1 gap-2" disabled={isBusy}>
                <Save className="h-4 w-4" />
                {isBusy ? "در حال ثبت..." : "ثبت مرجوعی و شروع هماهنگی"}
              </Button>
              <Button type="button" variant="outline" className="gap-2" onClick={handleCancel} disabled={isBusy}>
                <X className="h-4 w-4" />
                انصراف
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}