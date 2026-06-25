// src/features/sales/pages/SaleDetailPage.jsx
import { useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Save, X, AlertCircle } from "lucide-react";

import { Button } from "#/shared/components/ui/button";
import { useHeaderStore } from "#/shared/store/headerStore";
import { useNavigationStore } from "@/shared/store/navigationStore";
import { useSaleFormStore } from "#/features/sales/store/saleFormStore";
import { useSaleForm } from "#/features/sales/hooks/useSaleForm";
import { useSaleQuery } from "#/features/sales/services/queries";
import { useUpdateSaleMutation } from "#/features/sales/services/mutations";
import { useCustomersQuery } from "#/features/customers/services/queries";
import { useProductsQuery } from "#/features/inventory/products/services/queries";

import SaleCustomerSection from "../components/forms/SaleCustomerSection";
import SaleItemsSection from "../components/forms/SaleItemsSection";
import SaleInfoSection from "../components/forms/SaleInfoSection";
import SalePaymentSection from "../components/forms/SalePaymentSection";
import SaleDetailLoading from "../components/forms/SaleDetailLoading";

const ALL_FILTERS = {};
const PAGINATION = { pageIndex: 0, pageSize: 200 };
const SORTING = { id: "name", desc: false };

// ============================================================
// کامپوننت فرم — جدا از صفحه اصلی
// ============================================================
function SaleDetailForm({ saleData }) {
  const navigate = useNavigate();
  const location = useLocation();

  const { setFormData, resetForm, formData, initializeFromSale } =
    useSaleFormStore();

  const returnPath = useNavigationStore((s) => s.returnPath);
  const setReturnPath = useNavigationStore((s) => s.setReturnPath);

  // مقداردهی اولیه store — قبل از ساخت فرم
  initializeFromSale(saleData);

  const {
    formMethods,
    items,
    handleItemsChange,
    computedTotal,
    buildSalePayload,
  } = useSaleForm();

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = formMethods;

  const { data: customersData, isLoading: customersLoading } =
    useCustomersQuery(ALL_FILTERS, PAGINATION, SORTING);
  const { data: productsData, isLoading: productsLoading } = useProductsQuery(
    ALL_FILTERS,
    PAGINATION,
    SORTING
  );

  const customers = customersData?.items || [];
  const products = productsData?.items || [];

  const updateMutation = useUpdateSaleMutation(saleData.id);

  // منطق حفظ/ریست فرم
  useEffect(() => {
    const fromValidReturn = location.state?.newProductId;
    if (fromValidReturn) {
      setReturnPath(location.pathname);
    } else if (returnPath && returnPath !== location.pathname) {
      resetForm();
      setReturnPath(location.pathname);
    }
  }, [location.pathname, location.state, returnPath, setReturnPath, resetForm]);

  // اگر محصول جدید اضافه شد
  useEffect(() => {
    if (!location.state?.newProductId || !products.length) return;

    const newProductId = location.state.newProductId;
    const newProduct = products.find((p) => p.id === newProductId);

    if (newProduct) {
      const alreadyAdded = items.some((i) => i.productId === newProduct.id);
      if (!alreadyAdded) {
        handleItemsChange([
          ...items,
          {
            productId: newProduct.id,
            productCode: newProduct.code,
            productName: newProduct.name,
            unit: newProduct.unit || "",
            qty: 1,
            unitPrice: newProduct.salePrice || 0,
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

  const onSubmit = (formValues) => {
    if (!formData.customerId) {
      alert("لطفاً مشتری را انتخاب کنید.");
      return;
    }
    const payload = buildSalePayload(formValues);
    updateMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        navigate("/sales");
      },
    });
  };

  const handleCancel = () => {
    navigate(-1);
    resetForm();
  };

  const isBusy = updateMutation.isPending;
  const customerError = errors.customerId?.message;

  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in zoom-in-95 duration-300">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      >
        <div className="lg:col-span-2 space-y-4">
          <SaleItemsSection
            items={items}
            onItemsChange={handleItemsChange}
            products={products}
            isLoadingProducts={productsLoading}
          />
          <SaleInfoSection register={register} errors={errors} />
        </div>

        <div className="space-y-4">
          <SaleCustomerSection
            customers={customers}
            isLoading={customersLoading}
            selectedId={formData.customerId}
            onSelect={(id, name) =>
              setFormData({ customerId: id, customerName: name })
            }
            onClear={() => setFormData({ customerId: "", customerName: "" })}
            error={customerError}
          />

          <SalePaymentSection
            control={control}
            register={register}
            errors={errors}
            watch={formMethods.watch}
            totalAmount={computedTotal}
            setValue={setValue}
          />

          <div className="flex gap-2">
            <Button
              type="submit"
              className="flex-1 gap-2"
              disabled={isBusy || !formData.customerId}
            >
              <Save className="h-4 w-4" />
              {isBusy ? "در حال ذخیره..." : "به‌روزرسانی فروش"}
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
      </form>
    </div>
  );
}

// ============================================================
// صفحه اصلی
// ============================================================
export default function SaleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);
  const resetForm = useSaleFormStore((s) => s.resetForm);

  const {
    data: sale,
    isLoading: saleLoading,
    isError: saleError,
  } = useSaleQuery(id);

  useEffect(() => {
    setHeader({
      title: saleLoading ? "در حال بارگذاری..." : sale ? "ویرایش فروش" : "خطا",
      showBack: true,
      onBack: () => {
        resetForm();
        navigate(-1);
      },
    });
    return () => clearHeader();
  }, [setHeader, clearHeader, navigate, resetForm, sale, saleLoading]);

  if (saleLoading) return <SaleDetailLoading />;

  if (saleError || !sale) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-muted-foreground">
          {saleError
            ? `خطا در بارگذاری اطلاعات`
            : "فروشی با این شناسه یافت نشد."}
        </p>
        <Button variant="outline" onClick={() => navigate("/sales")}>
          بازگشت به لیست
        </Button>
      </div>
    );
  }

  return <SaleDetailForm key={sale.id} saleData={sale} />;
}
