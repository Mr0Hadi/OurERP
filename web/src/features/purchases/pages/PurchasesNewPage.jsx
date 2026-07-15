// src/features/purchases/pages/PurchasesNewPage.jsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useNavigationStore } from "@/shared/store/navigationStore";
import { Save, X } from "lucide-react";

import { Button } from "#/shared/components/ui/button";
import { useHeaderStore } from "#/shared/store/headerStore";
import { usePurchaseFormStore } from "#/features/purchases/store/purchaseFormStore";
import { useCreatePurchaseMutation } from "#/features/purchases/services/mutations";
import { useSuppliersQuery } from "#/features/suppliers/services/queries";

import PurchaseSupplierSection from "../components/forms/PurchaseSupplierSection";
import PurchaseItemsSection from "../components/forms/PurchaseItemsSection";
import PurchaseInfoSection from "../components/forms/PurchaseInfoSection";
import PurchasePaymentSection from "../components/forms/PurchasePaymentSection";
import PurchaseStatusSection from "../components/forms/PurchaseStatusSection";
import { ROUTES } from "@/shared/constants/routes";
import { useProductsQuery } from "@/features/warehouse/products/services/queries";

const ALL_FILTERS = {};
const PAGINATION = { pageIndex: 0, pageSize: 200 };
const SORTING = { id: "name", desc: false };

export default function PurchasesNewPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const setReturnPath = useNavigationStore((s) => s.setReturnPath);
  const setCurrentPath = useNavigationStore((s) => s.setCurrentPath);

  const { setFormData, formData, resetForm, initializeForNew, setItems } =
    usePurchaseFormStore();

  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    const fromValidReturn =
      location.state?.newSupplierId || location.state?.newProductId;

    const currentPath = location.pathname;
    setCurrentPath(currentPath);

    const { previousPath: prevPath } = useNavigationStore.getState();

    if (fromValidReturn) {
      setReturnPath(currentPath);
      initializeForNew();
      return;
    }

    const isReturningFromSubPage =
      prevPath === ROUTES.WAREHOUSE_PRODUCTS_NEW || prevPath === ROUTES.SUPPLIERS_NEW;

    if (isReturningFromSubPage) {
      setReturnPath(currentPath);
      initializeForNew();
      return;
    }

    resetForm();
    setReturnPath(currentPath);
    initializeForNew();
  }, [location.pathname, location.state, setCurrentPath, setReturnPath, resetForm, initializeForNew]);

  const createMutation = useCreatePurchaseMutation();

  const { data: suppliersData, isLoading: suppliersLoading } =
    useSuppliersQuery(ALL_FILTERS, PAGINATION, SORTING);

  const { data: productsData, isLoading: productsLoading } = useProductsQuery(
    ALL_FILTERS,
    PAGINATION,
    SORTING
  );

  const suppliers = suppliersData?.items || [];
  const products = productsData?.items || [];

  useEffect(() => {
    const state = location.state;
    if (state?.newSupplierId && suppliers.length > 0) {
      const found = suppliers.find((s) => s.id === state.newSupplierId);
      if (found) {
        const name =
          found.companyName || `${found.firstName} ${found.lastName}`;
        setFormData({ supplierId: found.id, supplierName: name });
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.state, suppliers, setFormData, navigate, location.pathname]);

  useEffect(() => {
    if (!location.state?.newProductId || !products.length) return;

    const newProductId = location.state.newProductId;
    const product = products.find((p) => p.id === newProductId);

    if (product) {
      const items = formData.items || [];
      const alreadyAdded = items.some((i) => i.productId === product.id);
      if (!alreadyAdded) {
        setItems([
          ...items,
          {
            productId: product.id,
            productName: product.name,
            productCode: product.code,
            unit: product.unit,
            qty: 1,
            unitPrice: product.purchasePrice ?? 0,
            discount: 0,
          },
        ]);
      }
    }

    navigate(location.pathname, { replace: true, state: {} });
  }, [
    location.pathname,
    location.state,
    navigate,
    products,
    formData.items,
    setItems,
  ]);

  useEffect(() => {
    const { resetForm: reset } = usePurchaseFormStore.getState();
    setHeader({
      title: "ثبت خرید جدید",
      showBack: true,
      onBack: () => {
        reset();
        navigate(-1);
      },
    });
    return () => clearHeader();
  }, [setHeader, clearHeader, navigate]);

  const items = formData.items || [];

  const computedTotal = items.reduce((sum, item) => {
    const base = (item.qty || 0) * (item.unitPrice || 0);
    const disc = (base * (item.discount || 0)) / 100;
    return sum + base - disc;
  }, 0);

  const onSubmit = (e) => {
    e.preventDefault();

    if (!formData.supplierId) {
      setShowErrors(true);
      return;
    }

    // محاسبه مبلغ پرداختی بسته به نوع پرداخت
    let finalPaidAmount;

    if (formData.paymentType === 'credit') {
      finalPaidAmount = 0;
    } else if (formData.paymentType === 'mixed') {
      const mixedPayments = formData.mixedPayments || [];
      finalPaidAmount = mixedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    } else {
      finalPaidAmount = Number(formData.paidAmount) || 0;
    }

    const payload = {
      supplierId: formData.supplierId,
      supplierName: formData.supplierName,
      invoiceNumber: formData.invoiceNumber,
      invoiceDate: formData.invoiceDate,
      expectedDeliveryDate: formData.expectedDeliveryDate || null,
      description: formData.description || '',
      items: items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        productCode: item.productCode,
        unit: item.unit,
        qty: item.qty,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        lineTotal: item.qty * item.unitPrice * (1 - (item.discount || 0) / 100),
      })),
      paymentType: formData.paymentType || 'cash',
      paidAmount: finalPaidAmount,
      status: formData.status || 'pending',
      totalAmount: computedTotal,
    };

    createMutation.mutate(payload, {
      onSuccess: () => {
        navigate(ROUTES.PURCHASES);
        resetForm();
      },
    });
  };

  const handleCancel = () => {
    navigate(-1);
    resetForm();
  };

  const isBusy = createMutation.isPending;

  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in zoom-in-95 duration-300">
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <PurchaseItemsSection
              items={items}
              products={products}
              isLoadingProducts={productsLoading}
              onItemsChange={setItems}
            />
            <PurchaseInfoSection
              formData={formData}
              onFormChange={setFormData}
              errors={{}}
            />
          </div>

          <div className="space-y-4">
            <PurchaseSupplierSection
              suppliers={suppliers}
              isLoading={suppliersLoading}
              selectedId={formData.supplierId}
              onSelect={(id, name) => {
                setFormData({ supplierId: id, supplierName: name });
                setShowErrors(false);
              }}
              onClear={() => setFormData({ supplierId: "", supplierName: "" })}
              error={showErrors && !formData.supplierId ? "انتخاب تامین‌کننده الزامی است" : null}
            />
            <PurchasePaymentSection
              formData={formData}
              onFormChange={setFormData}
              totalAmount={computedTotal}
              errors={{}}
            />

            <PurchaseStatusSection
              status={formData.status}
              selectedStatus={formData.status}
              onStatusChange={(val) => setFormData({ status: val })}
            />

            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1 gap-2"
                disabled={isBusy}
              >
                <Save className="h-4 w-4" />
                {isBusy ? "در حال ذخیره..." : "ذخیره خرید"}
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
        </div>
      </form>
    </div>
  );
}
