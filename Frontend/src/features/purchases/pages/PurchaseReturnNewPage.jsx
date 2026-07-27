// src/features/purchases/pages/PurchaseReturnNewPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Save, X } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { useHeaderStore } from "@/shared/store/headerStore";
import { usePurchaseReturnFormStore } from "../store/purchaseReturnFormStore";
import { usePurchaseReturnForm } from "../hooks/usePurchaseReturnForm";
import {
  useReturnablePurchasesQuery,
  useReturnablePurchaseQuery,
} from "../services/returns/queries";
import { useCreatePurchaseReturnMutation } from "../services/returns/mutations";

import PurchaseReturnPurchaseSection from "../components/forms/PurchaseReturnPurchaseSection";
import PurchaseReturnItemsSection from "../components/forms/PurchaseReturnItemsSection";
import PurchaseReturnInfoSection from "../components/forms/PurchaseReturnInfoSection";

export default function PurchaseReturnNewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const { formData, resetForm, initializeForPurchase } = usePurchaseReturnFormStore();
  const { setFormData, items, handleItemChange, computedTotal, buildPayload } =
    usePurchaseReturnForm();

  const [showErrors, setShowErrors] = useState(false);
  // اگر از لیست کسری‌های دریافت آمده باشیم، purchaseId از location.state می‌آید
  const [selectedPurchaseId, setSelectedPurchaseId] = useState(
    location.state?.purchaseId || null,
  );

  // نگاشت productId -> مقدار کسری، برای پیش‌پرکردن خودکار مقدار مرجوعی
  const prefillMap = useMemo(() => {
    const stateItems = location.state?.items || [];
    const map = {};
    stateItems.forEach((it) => {
      const shortage = (it.expectedQty || 0) - (it.receivedQty || 0);
      if (shortage > 0) map[it.productId] = shortage;
    });
    return map;
  }, [location.state]);

  const { data: returnablePurchases = [], isLoading: purchasesLoading } =
    useReturnablePurchasesQuery();
  const { data: selectedPurchaseDetail, isLoading: detailLoading } =
    useReturnablePurchaseQuery(selectedPurchaseId);

  useEffect(() => {
    resetForm();
    return () => resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedPurchaseDetail) {
      initializeForPurchase(selectedPurchaseDetail, prefillMap);
    }
  }, [selectedPurchaseDetail, prefillMap, initializeForPurchase]);

  useEffect(() => {
    setHeader({
      title: "ثبت مرجوعی خرید",
      showBack: true,
      onBack: () => {
        resetForm();
        navigate(-1);
      },
    });
    return () => clearHeader();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHeader, clearHeader, navigate]);

  const createMutation = useCreatePurchaseReturnMutation();
  const selectedCount = items.filter((i) => i.qty > 0).length;

  const onSubmit = (e) => {
    e.preventDefault();

    if (!formData.purchaseId) {
      setShowErrors(true);
      return;
    }
    if (selectedCount === 0) {
      setShowErrors(true);
      return;
    }

    createMutation.mutate(buildPayload());
  };

  const handleCancel = () => {
    resetForm();
    navigate(-1);
  };

  const isBusy = createMutation.isPending;

  return (
    <div className="container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in zoom-in-95 duration-300">
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <PurchaseReturnPurchaseSection
              purchases={returnablePurchases}
              isLoading={purchasesLoading || detailLoading}
              selectedPurchase={
                formData.purchaseId
                  ? {
                      invoiceNumber: formData.purchaseInvoiceNumber,
                      supplierName: formData.supplierName,
                      invoiceDate: selectedPurchaseDetail?.invoiceDate,
                    }
                  : null
              }
              onSelect={(id) => setSelectedPurchaseId(id)}
              onClear={() => {
                setSelectedPurchaseId(null);
                resetForm();
              }}
              error={showErrors && !formData.purchaseId ? "انتخاب خرید الزامی است" : null}
            />

            <PurchaseReturnItemsSection items={items} onItemChange={handleItemChange} />

            {showErrors && formData.purchaseId && selectedCount === 0 && (
              <p className="text-xs text-destructive px-1">
                حداقل باید یک کالا با تعداد بیشتر از صفر برای مرجوعی انتخاب شود
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
                {isBusy ? "در حال ثبت..." : "ثبت مرجوعی"}
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