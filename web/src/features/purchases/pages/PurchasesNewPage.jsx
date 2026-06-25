// src/features/purchases/pages/PurchasesNewPage.jsx
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useNavigationStore } from "@/shared/store/navigationStore";
import { Save, X } from "lucide-react";

import { Button } from "#/shared/components/ui/button";
import { useHeaderStore } from "#/shared/store/headerStore";
import { usePurchaseFormStore } from "#/features/purchases/store/purchaseFormStore";
import { usePurchaseForm } from "#/features/purchases/hooks/usePurchaseForm";
import { useCreatePurchaseMutation } from "#/features/purchases/services/mutations";
import { useSuppliersQuery } from "#/features/suppliers/services/queries";
import { useProductsQuery } from "#/features/inventory/products/services/queries";

import PurchaseSupplierSection from "../components/forms/PurchaseSupplierSection";
import PurchaseItemsSection from "../components/forms/PurchaseItemsSection";
import PurchaseInfoSection from "../components/forms/PurchaseInfoSection";
import PurchasePaymentSection from "../components/forms/PurchasePaymentSection";

const ALL_FILTERS = {};
const PAGINATION = { pageIndex: 0, pageSize: 200 };
const SORTING = { id: "name", desc: false };

export default function PurchasesNewPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const returnPath = useNavigationStore((s) => s.returnPath);
  const setReturnPath = useNavigationStore((s) => s.setReturnPath);

  const {
    setFormData,
    formData,
    resetForm,
    initializeForNew,
  } = usePurchaseFormStore();

  useEffect(() => {
    const fromValidReturn =
      location.state?.newSupplierId || location.state?.newProductId;

    if (fromValidReturn) {
      // از صفحه فرعی برگشتیم — state باید حفظ شود
      setReturnPath(location.pathname);
      initializeForNew();
    } else if (returnPath && returnPath !== location.pathname) {
      // از جای دیگه‌ای اومدیم — reset کن
      resetForm();
      setReturnPath(location.pathname);
    } else {
      // اولین بار یا همون صفحه‌ایم
      initializeForNew();
    }
  }, [
    location.pathname,
    location.state,
    returnPath,
    setReturnPath,
    initializeForNew,
    resetForm,
  ]);

  const {
    formMethods,
    items,
    handleItemsChange,
    computedTotal,
    buildPurchasePayload,
  } = usePurchaseForm();

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = formMethods;

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
      const alreadyAdded = items.some((i) => i.productId === product.id);
      if (!alreadyAdded) {
        handleItemsChange([
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
    handleItemsChange,
    items,
    location.pathname,
    location.state,
    navigate,
    products,
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

  const onSubmit = (formValues) => {
    if (!formData.supplierId) return;
    const payload = buildPurchasePayload(formValues);
    createMutation.mutate(payload, {
      onSuccess: () => {
        navigate("/purchases");
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
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <PurchaseItemsSection
              items={items}
              products={products}
              isLoadingProducts={productsLoading}
              onItemsChange={handleItemsChange}
            />
            <PurchaseInfoSection register={register} errors={errors} />
          </div>

          <div className="space-y-4">
            <PurchaseSupplierSection
              suppliers={suppliers}
              isLoading={suppliersLoading}
              selectedId={formData.supplierId}
              onSelect={(id, name) =>
                setFormData({ supplierId: id, supplierName: name })
              }
              onClear={() => setFormData({ supplierId: "", supplierName: "" })}
              error={!formData.supplierId && errors._supplier?.message}
            />
            <PurchasePaymentSection
              register={register}
              errors={errors}
              control={control}
              setValue={setValue}
              totalAmount={computedTotal}
            />

            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1 gap-2"
                disabled={isBusy || !formData.supplierId}
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
