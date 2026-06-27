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
import { usePurchaseQuery } from "#/features/purchases/services/queries";
import { useUpdatePurchaseMutation } from "#/features/purchases/services/mutations";
import { useSuppliersQuery } from "#/features/suppliers/services/queries";
import { useProductsQuery } from "#/features/inventory/products/services/queries";
import PurchaseSupplierSection from "../components/forms/PurchaseSupplierSection";
import PurchaseItemsSection from "../components/forms/PurchaseItemsSection";
import PurchaseInfoSection from "../components/forms/PurchaseInfoSection";
import PurchasePaymentSection from "../components/forms/PurchasePaymentSection";
import PurchasesDetailLoading from "../components/forms/PurchasesDetailLoading";
import PurchaseStatusSection from "../components/forms/PurchaseStatusSection";
import { useRemovePurchaseMutation } from "../services/mutations";

const ALL_FILTERS = {};
const PAGINATION = { pageIndex: 0, pageSize: 200 };
const SORTING = { id: "name", desc: false };

function PurchaseDetailForm({ purchaseData }) {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const {
    setFormData,
    setItems,
    resetForm,
    formData,
    initializeFromPurchase,
    initializedForId,
  } = usePurchaseFormStore();

  const { data: suppliersData, isLoading: suppliersLoading } =
    useSuppliersQuery(ALL_FILTERS, PAGINATION, SORTING);
  const { data: productsData, isLoading: productsLoading } = useProductsQuery(
    ALL_FILTERS,
    PAGINATION,
    SORTING
  );

  const suppliers = suppliersData?.items || [];
  const products = productsData?.items || [];

  const updateMutation = useUpdatePurchaseMutation(purchaseData.id);
  const deleteMutation = useRemovePurchaseMutation();

  const items = formData.items || [];

  const computedTotal = items.reduce((sum, item) => {
    const base = (item.qty || 0) * (item.unitPrice || 0);
    const disc = (base * (item.discount || 0)) / 100;
    return sum + base - disc;
  }, 0);

  // initializeFromPurchase باید فقط یک‌بار هنگام mount اجرا شود
  useEffect(() => {
    initializeFromPurchase(purchaseData);
  }, [purchaseData.id, initializeFromPurchase]);

  if (initializedForId !== purchaseData.id) {
    return null;
  }

  const onSubmit = (e) => {
    e.preventDefault();

    if (!formData.supplierId) {
      setShowErrors(true);
      return;
    }

    const payload = {
      supplierId: formData.supplierId,
      supplierName: formData.supplierName,
      invoiceNumber: formData.invoiceNumber,
      invoiceDate: formData.invoiceDate,
      dueDate: formData.dueDate || null,
      description: formData.description || "",
      items: items.map((item) => ({
        ...item,
        lineTotal: item.qty * item.unitPrice * (1 - (item.discount || 0) / 100),
      })),
      paymentType: formData.paymentType || "cash",
      paidAmount: Number(formData.paidAmount) || 0,
      checkNumber: formData.checkNumber || null,
      transferRef: formData.transferRef || null,
      status: formData.status || "pending",
      totalAmount: computedTotal,
    };

    updateMutation.mutate(payload, {
      onSuccess: () => navigate("/purchases"),
    });
  };

  const handleDelete = () => {
    deleteMutation.mutate(purchaseData.id, {
      onSuccess: () => {
        resetForm();
        navigate("/purchases");
      },
    });
  };

  const isBusy = updateMutation.isPending || deleteMutation.isPending;

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
              error={
                showErrors && !formData.supplierId
                  ? "انتخاب تامین‌کننده الزامی است"
                  : null
              }
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
              <Button type="submit" className="flex-1 gap-2" disabled={isBusy}>
                <Save className="h-4 w-4" />
                {updateMutation.isPending
                  ? "در حال ذخیره..."
                  : "به‌روزرسانی خرید"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={isBusy}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                انصراف
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
              آیا از حذف این خرید اطمینان دارید؟ این عملیات اطلاعات خرید ثبت شده
              را به طور کامل حذف میکند
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

export default function PurchaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const { data: purchase, isLoading, isError } = usePurchaseQuery(id);

  useEffect(() => {
    setHeader({
      title: isLoading
        ? "در حال بارگذاری..."
        : purchase
        ? "ویرایش خرید"
        : "خطا",
      showBack: true,
      onBack: () => navigate(-1),
    });
    return () => clearHeader();
  }, [navigate, setHeader, clearHeader, purchase, isLoading]);

  if (isLoading) return <PurchasesDetailLoading />;

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
