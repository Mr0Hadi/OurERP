// src/features/sales/pages/SaleDetailPage.jsx

import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Save, X } from "lucide-react";

import { Button } from "#/shared/components/ui/button";
import { useHeaderStore } from "#/shared/store/headerStore";
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

// تابع کمکی برای تبدیل تاریخ شمسی به فرمت ISO (YYYY-MM-DD)
// در پروژه واقعی از کتابخانه‌ای مانند 'moment-jalaali' یا 'date-fns-jalali' استفاده کنید
function convertPersianDateToISO(persianDate) {
  if (!persianDate) return "";
  // اگر تاریخ به فرمت 'YYYY/MM/DD' باشد، اسلش‌ها را با خط تیره جایگزین می‌کنیم
  if (persianDate.includes('/')) {
    return persianDate.replace(/\//g, '-');
  }
  // در غیر این صورت فرض می‌کنیم تاریخ به فرمت ISO است (یا قبلاً تبدیل شده)
  return persianDate;
}

export default function SaleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const { formData, setFormData, setItems, resetForm } = useSaleFormStore();

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

  // ------------------------------------------------------------
  // ۱) بارگذاری داده‌های فروش در استور فرم
  // ------------------------------------------------------------
  useEffect(() => {
    if (!sale) return;

    // تنظیم اطلاعات اصلی فرم
    setFormData({
      customerId: sale.customerId || "",
      customerName: sale.customerName || "",
      invoiceNumber: sale.invoiceNumber || "",
      invoiceDate: sale.invoiceDate || "",
      description: sale.description || "",
      paymentType: sale.paymentType || "cash",
      paidAmount: sale.paidAmount?.toString() || "",
    });

    // فرمت‌دهی آیتم‌ها
    const formattedItems = (sale.items || []).map((item) => ({
      productId: item.productId,
      productName: item.productName,
      productCode: item.productCode,
      unit: item.unit || "",
      qty: item.qty,
      unitPrice: item.unitPrice,
      discount: item.discount || 0,
    }));
    setItems(formattedItems);

    // تنظیم مقادیر react-hook-form (با تبدیل تاریخ)
    setValue("invoiceNumber", sale.invoiceNumber || "");
    setValue("invoiceDate", convertPersianDateToISO(sale.invoiceDate) || "");
    setValue("description", sale.description || "");
    setValue("paymentType", sale.paymentType || "cash");
    setValue("paidAmount", sale.paidAmount?.toString() || "");
  }, [sale, setFormData, setItems, setValue]);

  // ------------------------------------------------------------
  // ۲) تنظیم هدر صفحه
  // ------------------------------------------------------------
  useEffect(() => {
    setHeader({
      title: "ویرایش فروش",
      showBack: true,
      onBack: () => {
        resetForm();
        navigate(-1);
      },
    });
    return () => {
      clearHeader();
    };
  }, [setHeader, clearHeader, navigate, resetForm]);

  // ------------------------------------------------------------
  // ۳) هندلرهای ارسال و انصراف
  // ------------------------------------------------------------
  const onSubmit = handleSubmit((formValues) => {
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
  });

  const handleCancel = () => {
    resetForm();
    navigate(-1);
  };

  // ------------------------------------------------------------
  // ۴) نمایش وضعیت‌های بارگذاری و خطا
  // ------------------------------------------------------------
  if (saleLoading) {
    return <SaleDetailLoading />;
  }

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
        {/* ستون اصلی */}
        <div className="lg:col-span-2 space-y-4">
          <SaleItemsSection
            items={items}
            onItemsChange={handleItemsChange}
            products={products}
            isLoadingProducts={productsLoading}
          />
          <SaleInfoSection
            register={register}
            errors={errors}
          />
        </div>

        {/* ستون کناری */}
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
            setValue={setValue} // 👈 ارسال setValue به کامپوننت
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