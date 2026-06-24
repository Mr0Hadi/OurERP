import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Save, X } from "lucide-react";
import { Button } from "#/shared/components/ui/button";
import { useHeaderStore } from "#/shared/store/headerStore";
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
  const { setHeader } = useHeaderStore();
  const { formData, setFormData, resetForm } = useSaleFormStore();
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

  // اگر از صفحه مشتری جدید برگشتیم
  useEffect(() => {
    if (location.state?.newCustomerId && customers.length > 0) {
      const newCustomer = customers.find(
        (c) => c.id === location.state.newCustomerId
      );
      if (newCustomer) {
        const name =
          newCustomer.companyName ||
          `${newCustomer.firstName} ${newCustomer.lastName}`;
        setFormData({
          customerId: newCustomer.id,
          customerName: name,
        });
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state, customers, setFormData]);

  // اگر محصول جدید اضافه شد
  useEffect(() => {
    if (location.state?.newProductId && products.length > 0) {
      const newProduct = products.find(
        (p) => p.id === location.state.newProductId
      );
      if (
        newProduct &&
        !items.some((item) => item.productId === newProduct.id)
      ) {
        handleItemsChange([
          ...items,
          {
            productId: newProduct.id,
            productCode: newProduct.code,
            productName: newProduct.name,
            qty: 1,
            unitPrice: newProduct.salePrice || 0,
            discount: 0,
            lineTotal: newProduct.salePrice || 0,
          },
        ]);
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state, products, items, handleItemsChange]);

  useEffect(() => {
    setHeader({
      title: "ثبت فروش جدید",
      showBack: true,
      onBack: () => {
        resetForm();
        navigate(-1);
      },
    });
  }, [setHeader, navigate, resetForm]);

  const handleSelectCustomer = (id, name) => {
    setFormData({ customerId: id, customerName: name });
  };

  const handleClearCustomer = () => {
    setFormData({ customerId: "", customerName: "" });
  };

  const onSubmit = formMethods.handleSubmit((formValues) => {
    if (!formData.customerId) {
      return;
    }

    const payload = buildSalePayload(formValues);
    createMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        formMethods.reset();
        navigate("/sales");
      },
    });
  });

  const handleCancel = () => {
    resetForm();
    formMethods.reset();
    navigate(-1);
  };

  const isBusy = createMutation.isPending;
  const customerError = formMethods.formState.errors.customerId?.message;

  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in zoom-in-95 duration-300">
      <form
        onSubmit={onSubmit}
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      >
        {/* ستون اصلی */}
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

        {/* ستون کناری */}
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
