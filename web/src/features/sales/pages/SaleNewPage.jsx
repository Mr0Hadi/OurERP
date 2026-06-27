// src/features/sales/pages/SaleNewPage.jsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Save, X } from "lucide-react";
import { Button } from "#/shared/components/ui/button";
import { useHeaderStore } from "#/shared/store/headerStore";
import { useNavigationStore } from "@/shared/store/navigationStore";
import { useSaleFormStore } from "#/features/sales/store/saleFormStore";
import { useCreateSaleMutation } from "#/features/sales/services/mutations";
import { useCustomersQuery } from "#/features/customers/services/queries";
import { useProductsQuery } from "#/features/inventory/products/services/queries";
import SaleCustomerSection from "#/features/sales/components/forms/SaleCustomerSection";
import SaleItemsSection from "#/features/sales/components/forms/SaleItemsSection";
import SaleInfoSection from "#/features/sales/components/forms/SaleInfoSection";
import SalePaymentSection from "#/features/sales/components/forms/SalePaymentSection";
import SaleStatusSection from "../components/forms/SaleStatusSection";

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

  const { formData, setFormData, resetForm, initializeForNew, setItems } =
    useSaleFormStore();

  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    const fromValidReturn =
      location.state?.newCustomerId || location.state?.newProductId;

    const currentPath = location.pathname;
    setCurrentPath(currentPath);

    const { previousPath: prevPath } = useNavigationStore.getState();

    if (fromValidReturn) {
      setReturnPath(currentPath);
      initializeForNew();
      return;
    }

    const isReturningFromSubPage =
      prevPath === "/products/new" || prevPath === "/customers/new";

    if (isReturningFromSubPage) {
      setReturnPath(currentPath);
      initializeForNew();
      return;
    }

    resetForm();
    setReturnPath(currentPath);
    initializeForNew();
  }, [location.pathname, location.state, setCurrentPath, setReturnPath, resetForm, initializeForNew]);

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

  useEffect(() => {
    if (!location.state?.newProductId || !products.length) return;

    const newProductId = location.state.newProductId;
    const newProduct = products.find((p) => p.id === newProductId);

    if (newProduct) {
      const items = formData.items || [];
      const alreadyAdded = items.some((i) => i.productId === newProduct.id);
      if (!alreadyAdded) {
        setItems([
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
    location.pathname,
    location.state,
    navigate,
    products,
    formData.items,
    setItems,
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

  const items = formData.items || [];

  const computedTotal = items.reduce((sum, item) => {
    const base = (item.qty || 0) * (item.unitPrice || 0);
    const disc = (base * (item.discount || 0)) / 100;
    return sum + base - disc;
  }, 0);

  const onSubmit = (e) => {
    e.preventDefault();

    if (!formData.customerId) {
      setShowErrors(true);
      return;
    }

    const payload = {
      customerId: formData.customerId,
      customerName: formData.customerName,
      invoiceNumber: formData.invoiceNumber,
      invoiceDate: formData.invoiceDate,
      dueDate: formData.dueDate || null,
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
      paidAmount: Number(formData.paidAmount) || 0,
      checkNumber: formData.checkNumber || null,
      transferRef: formData.transferRef || null,
      status: formData.status || 'pending',
      totalAmount: computedTotal,
    };

    createMutation.mutate(payload, {
      onSuccess: () => {
        navigate("/sales");
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
            <SaleItemsSection
              items={items}
              onItemsChange={setItems}
              products={products}
              isLoadingProducts={productsLoading}
            />
            <SaleInfoSection
              formData={formData}
              onFormChange={setFormData}
              errors={{}}
            />
          </div>

          <div className="space-y-4">
            <SaleCustomerSection
              customers={customers}
              isLoading={customersLoading}
              selectedId={formData.customerId}
              onSelect={(id, name) => {
                setFormData({ customerId: id, customerName: name });
                setShowErrors(false);
              }}
              onClear={() => setFormData({ customerId: "", customerName: "" })}
              error={showErrors && !formData.customerId ? "انتخاب مشتری الزامی است" : null}
            />

            <SalePaymentSection
              formData={formData}
              onFormChange={setFormData}
              totalAmount={computedTotal}
              errors={{}}
            />

            <SaleStatusSection
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
        </div>
      </form>
    </div>
  );
}
