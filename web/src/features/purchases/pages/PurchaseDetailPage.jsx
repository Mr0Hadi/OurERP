// src/features/purchases/pages/PurchaseDetailPage.jsx

import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Save, X, AlertCircle } from "lucide-react";

import { Button } from "#/shared/components/ui/button";
import { useHeaderStore } from "#/shared/store/headerStore";
import { usePurchaseFormStore } from "#/features/purchases/store/purchaseFormStore";
import { usePurchaseForm } from "#/features/purchases/hooks/usePurchaseForm";
import { usePurchaseQuery } from "#/features/purchases/services/queries";
import { useUpdatePurchaseMutation } from "#/features/purchases/services/mutations";
import { useSuppliersQuery } from "#/features/suppliers/services/queries";
import { useProductsQuery } from "#/features/inventory/products/services/queries";
import PurchaseSupplierSection from "../components/forms/PurchaseSupplierSection";
import PurchaseItemsSection from "../components/forms/PurchaseItemsSection";
import PurchaseInfoSection from "../components/forms/PurchaseInfoSection";
import PurchasePaymentSection from "../components/forms/PurchasePaymentSection";
import PurchasesDetailLoading from "../components/forms/PurchasesDetailLoading";

const ALL_FILTERS = {};
const PAGINATION = { pageIndex: 0, pageSize: 200 };
const SORTING = { id: "name", desc: false };

// ============================================================
// کامپوننت فرم
// ============================================================
function PurchaseDetailForm({ purchaseData }) {
  const navigate = useNavigate();
  const { setFormData, setItems, resetForm, formData } = usePurchaseFormStore();
  const {
    formMethods,
    items,
    handleItemsChange,
    computedTotal,
    buildPurchasePayload,
  } = usePurchaseForm(purchaseData);

  const { data: suppliersData, isLoading: suppliersLoading } =
    useSuppliersQuery(ALL_FILTERS, PAGINATION, SORTING);
  const { data: productsData, isLoading: productsLoading } = useProductsQuery(
    ALL_FILTERS,
    PAGINATION,
    SORTING
  );

  const suppliers = suppliersData?.items || [];
  const products = productsData?.items || [];

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = formMethods;

  const updateMutation = useUpdatePurchaseMutation(purchaseData.id);
  useEffect(() => {
    if (!purchaseData) return;

    // ست کردن استور
    setFormData({
      supplierId: purchaseData.supplierId || "",
      supplierName: purchaseData.supplierName || "",
    });

    const formattedItems = (purchaseData.items || []).map((item) => ({
      productId: item.productId,
      productName: item.productName,
      productCode: item.productCode,
      unit: item.unit || "",
      qty: item.qty,
      unitPrice: item.unitPrice,
      discount: item.discount || 0,
    }));
    setItems(formattedItems);

    // استفاده از reset به جای setValue تکی
    formMethods.reset({
      invoiceNumber: purchaseData.invoiceNumber || "",
      invoiceDate: purchaseData.invoiceDate || "",
      description: purchaseData.description || "",
      paymentType: purchaseData.paymentType || "cash",
      paidAmount: purchaseData.paidAmount?.toString() || "",
      checkNumber: purchaseData.checkNumber || "",
      transferRef: purchaseData.transferRef || "",
    });
  }, [formMethods, purchaseData, setFormData, setItems]);

  const onSubmit = (formValues) => {
    if (!formData.supplierId) {
      alert("لطفاً تامین‌کننده را انتخاب کنید.");
      return;
    }

    const payload = buildPurchasePayload(formValues);
    updateMutation.mutate(payload, {
      onSuccess: () => {
        resetForm();
        navigate("/purchases");
      },
    });
  };

  const handleCancel = () => {
    resetForm();
    navigate(-1);
  };

  const isBusy = updateMutation.isPending;

  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in zoom-in-95 duration-300">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ستون اصلی - کالاها + اطلاعات فاکتور */}
          <div className="lg:col-span-2 space-y-4">
            <PurchaseItemsSection
              items={items}
              products={products}
              isLoadingProducts={productsLoading}
              onItemsChange={handleItemsChange}
            />
            <PurchaseInfoSection register={register} errors={errors} />
          </div>

          {/* ستون کناری - تامین‌کننده + پرداخت */}
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

            {/* دکمه‌های عملیات */}
            <div className="flex gap-2">
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
              <Button type="submit" className="flex-1 gap-2" disabled={isBusy}>
                <Save className="h-4 w-4" />
                {isBusy ? "در حال ذخیره..." : "به‌روزرسانی خرید"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

// ============================================================
// صفحه‌ی اصلی
// ============================================================
export default function PurchaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);
  const resetForm = usePurchaseFormStore((s) => s.resetForm);

  const { data: purchase, isLoading, isError } = usePurchaseQuery(id);

  // تنظیم هدر
  useEffect(() => {
    setHeader({
      title: isLoading
        ? "در حال بارگذاری..."
        : purchase
        ? `ویرایش خرید`
        : "خطا",
      showBack: true,
      onBack: () => {
        resetForm();
        navigate(-1);
      },
    });
    return () => clearHeader();
  }, [navigate, setHeader, clearHeader, resetForm, purchase, isLoading]);

  // حالت بارگذاری
  if (isLoading) {
    return <PurchasesDetailLoading />;
  }

  // حالت خطا
  if (isError || !purchase) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-muted-foreground">
          خرید مورد نظر یافت نشد یا خطایی رخ داده است.
        </p>
        <Button variant="outline" onClick={() => navigate("/purchases")}>
          بازگشت به لیست
        </Button>
      </div>
    );
  }

  return <PurchaseDetailForm key={purchase.id} purchaseData={purchase} />;
}
