import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Save, X } from "lucide-react";
import { Button } from "#/shared/components/ui/button";
import { useHeaderStore } from "#/shared/store/headerStore";
import { useNavigationStore } from "@/shared/store/navigationStore";
import { useSaleFormStore } from "#/features/sales/store/saleFormStore";
import { useSaleForm } from "#/features/sales/hooks/useSaleForm";
import { useCreateSaleMutation } from "#/features/sales/services/mutations";
import { useCustomersQuery } from "#/features/customers/services/queries";
import { useProductsQuery } from "#/features/inventory/products/services/queries";
import SaleCustomerSection from "#/features/sales/components/forms/SaleCustomerSection";
import SaleItemsSection from "#/features/sales/components/forms/SaleItemsSection";
import SaleInfoSection from "#/features/sales/components/forms/SaleInfoSection";
import SalePaymentSection from "#/features/sales/components/forms/SalePaymentSection";

const ALL_FILTERS = {};
const PAGINATION = { pageIndex: 0, pageSize: 200 };
const SORTING = { id: "name", desc: false };

export default function SaleNewPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const setReturnPath = useNavigationStore((s) => s.setReturnPath);
  const setCurrentPath = useNavigationStore((s) => s.setCurrentPath);

  const {
    formData,
    setFormData,
    resetForm,
    initializeForNew,
  } = useSaleFormStore();

  // منطق حفظ/ریست فرم بر اساس مسیر ورود
  useEffect(() => {
    const fromValidReturn =
      location.state?.newCustomerId || location.state?.newProductId;

    const currentPath = location.pathname;

    // اول currentPath رو آپدیت کن تا previousPath درست باشه
    setCurrentPath(currentPath);

    // بعد previousPath رو بخون
    const { previousPath: prevPath } = useNavigationStore.getState();

    if (fromValidReturn) {
      // از صفحه فرعی با state برگشتیم
      setReturnPath(currentPath);
      initializeForNew();
      return;
    }

    const isReturningFromSubPage =
      prevPath === '/products/new' || prevPath === '/customers/new';

    if (isReturningFromSubPage) {
      // از صفحه فرعی بدون state برگشتیم
      setReturnPath(currentPath);
      initializeForNew();
      return;
    }

    // از مسیر دیگری اومدیم — فرم رو ریست کن
    resetForm();
    setReturnPath(currentPath);
    initializeForNew();
  }, [location.pathname, location.state, setCurrentPath]);

  const {
    formMethods,
    items,
    handleItemsChange,
    computedTotal,
    buildSalePayload,
  } = useSaleForm();

  const createMutation = useCreateSaleMutation();

  const { data: customersData, isLoading: customersLoading } =
    useCustomersQuery(ALL_FILTERS, PAGINATION, SORTING);
  const { data: productsData, isLoading: productsLoading } = useProductsQuery(
    ALL_FILTERS,
    PAGINATION,
    SORTING
  );

  const customers = customersData?.items || [];
  const products = productsData?.items || [];

  // اگر مشتری جدید اضافه شد
  useEffect(() => {
    const state = location.state;
    if (state?.newCustomerId && customers.length > 0) {
      const newCustomer = customers.find((c) => c.id === state.newCustomerId);
      if (newCustomer) {
        const name =
          newCustomer.companyName ||
          `${newCustomer.firstName} ${newCustomer.lastName}`;
        setFormData({ customerId: newCustomer.id, customerName: name });
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.state, customers, setFormData, navigate, location.pathname]);

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
            unit: newProduct.unit,
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
      title: "ثبت فروش جدید",
      showBack: true,
      onBack: () => {
        reset();
        navigate(-1);
      },
    });
    return () => clearHeader();
  }, [setHeader, clearHeader, navigate]);

  const handleSelectCustomer = (id, name) => {
    setFormData({ customerId: id, customerName: name });
  };

  const handleClearCustomer = () => {
    setFormData({ customerId: '', customerName: '' });
  };

  const onSubmit = formMethods.handleSubmit((formValues) => {
    if (!formData.customerId) return;

    const payload = buildSalePayload(formValues);
    createMutation.mutate(payload, {
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

  const isBusy = createMutation.isPending;
  const customerError = formMethods.formState.errors.customerId?.message;

  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in zoom-in-95 duration-300">
      <form
        onSubmit={onSubmit}
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      >
        <div className="lg:col-span-2 space-y-4">
          <SaleItemsSection
            items={items}
            onItemsChange={handleItemsChange}
            products={products}
            isLoadingProducts={productsLoading}
          />
          <SaleInfoSection
            register={formMethods.register}
            errors={formMethods.formState.errors}
          />
        </div>

        <div className="space-y-4">
          <SaleCustomerSection
            customers={customers}
            isLoading={customersLoading}
            selectedId={formData.customerId}
            onSelect={handleSelectCustomer}
            onClear={handleClearCustomer}
            error={customerError}
          />

          <SalePaymentSection
            control={formMethods.control}
            register={formMethods.register}
            errors={formMethods.formState.errors}
            watch={formMethods.watch}
            totalAmount={computedTotal}
          />

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isBusy || !formData.customerId}
              className="flex-1 gap-2"
            >
              <Save className="h-4 w-4" />
              {isBusy ? "در حال ذخیره..." : "ذخیره فروش"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isBusy}
              className="gap-2"
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