// src/features/purchases/pages/PurchaseDetailPage.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Save, X, AlertCircle, Trash2 } from "lucide-react";

import { Button } from "#/shared/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "#/shared/components/ui/alert-dialog";
import { useHeaderStore } from "#/shared/store/headerStore";
import { usePurchaseFormStore } from "#/features/purchases/store/purchaseFormStore";
import { usePurchaseForm } from "#/features/purchases/hooks/usePurchaseForm";
import { usePurchaseQuery } from "#/features/purchases/services/queries";
import {
  useUpdatePurchaseMutation,
  useUpdatePurchaseStatusMutation,
} from "#/features/purchases/services/mutations";
import { useSuppliersQuery } from "#/features/suppliers/services/queries";
import { useProductsQuery } from "#/features/inventory/products/services/queries";
import { PURCHASE_STATUSES } from "#/features/purchases/services/mockData";
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const { setFormData, resetForm, formData, initializeFromPurchase } =
    usePurchaseFormStore();

  // مقداردهی اولیه — فقط اگر store هنوز برای این خرید init نشده باشد
  initializeFromPurchase(purchaseData);

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
  const deleteMutation = useUpdatePurchaseStatusMutation();

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
    navigate(-1);
  };

  const handleDelete = () => {
    deleteMutation.mutate(
      { id: purchaseData.id, status: PURCHASE_STATUSES.CANCELLED },
      {
        onSuccess: () => {
          resetForm();
          navigate("/purchases");
        },
      }
    );
  };

  const isBusy = updateMutation.isPending || deleteMutation.isPending;

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
                {updateMutation.isPending ? "در حال ذخیره..." : "به‌روزرسانی خرید"}
              </Button>
            </div>

            <Button
              type="button"
              variant="destructive"
              className="w-full gap-2"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isBusy}
            >
              <Trash2 className="h-4 w-4" />
              حذف خرید
            </Button>
          </div>
        </div>
      </form>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف خرید</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف این خرید اطمینان دارید؟ این عملیات وضعیت خرید را به لغو
              شده تغییر می‌دهد.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              انصراف
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "در حال حذف..." : "حذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

  useEffect(() => {
    setHeader({
      title: isLoading
        ? "در حال بارگذاری..."
        : purchase
        ? `ویرایش خرید`
        : "خطا",
      showBack: true,
      onBack: () => {
        navigate(-1);
      },
    });
    return () => clearHeader();
  }, [navigate, setHeader, clearHeader, resetForm, purchase, isLoading]);

  if (isLoading) {
    return <PurchasesDetailLoading />;
  }

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
