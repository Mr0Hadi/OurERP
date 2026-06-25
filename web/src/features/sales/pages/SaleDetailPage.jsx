// src/features/sales/pages/SaleDetailPage.jsx
import { useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Save, X } from "lucide-react";

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

function convertPersianDateToISO(persianDate) {
  if (!persianDate) return "";
  if (persianDate.includes('/')) {
    return persianDate.replace(/\//g, '-');
  }
  return persianDate;
}

export default function SaleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const returnPath = useNavigationStore((s) => s.returnPath);
  const setReturnPath = useNavigationStore((s) => s.setReturnPath);

  const {
    formData,
    setFormData,
    resetForm,
    initializeFromSale,
  } = useSaleFormStore();

  const {
    data: sale,
    isLoading: saleLoading,
    error: saleError,
  } = useSaleQuery(id);

  const { data: customersData, isLoading: customersLoading } =
    useCustomersQuery(ALL_FILTERS, PAGINATION, SORTING);
  const { data: productsData, isLoading: productsLoading } =
    useProductsQuery(ALL_FILTERS, PAGINATION, SORTING);

  const customers = customersData?.items || [];
  const products = productsData?.items || [];

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

  const updateMutation = useUpdateSaleMutation(id);

  // منطق حفظ/ریست فرم
  useEffect(() => {
    const fromValidReturn = location.state?.newProductId;

    if (fromValidReturn) {
      setReturnPath(location.pathname);
    } else if (returnPath && returnPath !== location.pathname) {
      resetForm();
      setReturnPath(location.pathname);
    }
  }, [
    location.pathname,
    location.state,
    returnPath,
    setReturnPath,
    resetForm,
  ]);

  // بارگذاری داده‌های فروش
  useEffect(() => {
    if (!sale) return;

    initializeFromSale(sale);

    setValue("invoiceNumber", sale.invoiceNumber || "");
    setValue("invoiceDate", convertPersianDateToISO(sale.invoiceDate) || "");
    setValue("description", sale.description || "");
    setValue("paymentType", sale.paymentType || "cash");
    setValue("paidAmount", sale.paidAmount?.toString() || "");
  }, [sale, initializeFromSale, setValue]);

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

  useEffect(() => {
    const { resetForm: reset } = useSaleFormStore.getState();
    setHeader({
      title: "ویرایش فروش",
      showBack: true,
      onBack: () => {
        reset();
        navigate(-1);
      },
    });
    return () => clearHeader();
  }, [setHeader, clearHeader, navigate]);

  const onSubmit = handleSubmit((formValues) => {
    if (!formData.customerId) {
      alert("لطفاً مشتری را انتخاب کنید.");
      return;
    }

    const payload = buildSalePayload(formValues);
    updateMutation.mutate(payload, {
      onSuccess: () => {
        navigate("/sales");
        resetForm();
      },
    });
  });

  const handleCancel = () => {
    navigate(-1);
    resetForm();
  };

  if (saleLoading) return <SaleDetailLoading />;

  if (saleError) {
    return (
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700">
          خطا در بارگذاری اطلاعات: {saleError.message}
        </div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="container max-w-7xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-yellow-700">
          فروشی با این شناسه یافت نشد.
        </div>
      </div>
    );
  }

  const isBusy = updateMutation.isPending;
  const customerError = errors.customerId?.message;

  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in zoom-in-95 duration-300">
      <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
