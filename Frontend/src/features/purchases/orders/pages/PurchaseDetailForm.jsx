import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Save, X, Trash2, Ban, Undo2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { usePurchaseFormStore } from "@/features/purchases/orders/store/purchaseFormStore";
import {
  useUpdatePurchaseMutation,
  useUpdatePurchaseStatusMutation,
  useRemovePurchaseMutation,
} from "@/features/purchases/orders/services/mutations";
import { useSuppliersQuery } from "@/features/suppliers/services/queries";
import PurchaseSupplierSection from "../components/forms/PurchaseSupplierSection";
import PurchaseItemsSection from "../components/forms/PurchaseItemsSection";
import OrderInfoSection from "@/shared/components/forms/OrderInfoSection";
import PurchasePaymentSection from "../components/forms/PurchasePaymentSection";
import PurchaseStatusSection from "../components/forms/PurchaseStatusSection";
import { ROUTES } from "@/shared/constants/routes";
import { useProductsQuery } from "@/features/warehouse/products/services/queries";
import {
  canDeletePurchase,
  canCancelPurchase,
  getPurchaseLockReason,
} from "@/features/purchases/orders/domain/purchaseRules";
import { PURCHASE_STATUSES } from "@/features/purchases/orders/services/constants";
import { hasAnythingArrived } from "@/features/purchases/returns/domain/purchaseReturnVocabulary";

const ALL_FILTERS = {};
const PAGINATION = { pageIndex: 0, pageSize: 200 };
const SORTING = { id: "name", desc: false };

export default function PurchaseDetailForm({ purchaseData }) {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const {
    setFormData,
    setItems,
    resetForm,
    formData,
    initializeFromPurchase,
    initializedForId,
  } = usePurchaseFormStore();

  // مرجوعی خرید حالا دقیقاً مثل مرجوعی فروش است: تا وقتی چیزی از
  // خرید رسیده باشد می‌شود ادعا ثبت کرد. معیار خودِ کالای رسیده است نه
  // وضعیت خرید — نیمی که با ماشین اول آمده هم قابل ادعاست.
  const canReturn = hasAnythingArrived(purchaseData);

  const { data: suppliersData, isLoading: suppliersLoading } =
    useSuppliersQuery(ALL_FILTERS, PAGINATION, SORTING);
  const { data: productsData, isLoading: productsLoading } = useProductsQuery(
    ALL_FILTERS,
    PAGINATION,
    SORTING,
  );

  const suppliers = suppliersData?.items || [];
  const products = productsData?.items || [];

  const updateMutation = useUpdatePurchaseMutation(purchaseData.id);
  const deleteMutation = useRemovePurchaseMutation();
  const statusMutation = useUpdatePurchaseStatusMutation();

  const items = formData.items || [];

  const computedTotal = items.reduce((sum, item) => {
    const base = (item.qty || 0) * (item.unitPrice || 0);
    const disc = (base * (item.discount || 0)) / 100;
    return sum + base - disc;
  }, 0);

  // initializeFromPurchase باید فقط یک‌بار هنگام mount اجرا شود
  useEffect(() => {
    initializeFromPurchase(purchaseData);
  }, [purchaseData.id, purchaseData.updatedAt, initializeFromPurchase]);

  if (initializedForId !== `${purchaseData.id}:${purchaseData.updatedAt}`) {
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
      mixedPayments: formData.mixedPayments || [],
      status: formData.status || "pending",
      totalAmount: computedTotal,
    };

    updateMutation.mutate(payload, {
      onSuccess: () => navigate(ROUTES.PURCHASES),
    });
  };

  const handleDelete = () => {
    deleteMutation.mutate(purchaseData.id, {
      onSuccess: () => {
        resetForm();
        navigate(ROUTES.PURCHASES);
      },
    });
  };

  const handleCancel = () => {
    statusMutation.mutate(
      { id: purchaseData.id, status: PURCHASE_STATUSES.CANCELLED },
      {
        onSuccess: () => {
          resetForm();
          navigate(ROUTES.PURCHASES);
        },
      },
    );
  };

  const deletable = canDeletePurchase(purchaseData);
  const cancellable = !deletable && canCancelPurchase(purchaseData);
  const lockReason = getPurchaseLockReason(purchaseData);

  const isBusy =
    updateMutation.isPending || deleteMutation.isPending || statusMutation.isPending;

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
            <OrderInfoSection
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

            {canReturn && (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() =>
                  navigate(
                    `${ROUTES.PURCHASES_RETURNS_NEW}?purchaseId=${purchaseData.id}`,
                  )
                }
                disabled={isBusy}
              >
                <Undo2 className="h-4 w-4" />
                ثبت مرجوعی برای این خرید
              </Button>
            )}

            {deletable && (
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
            )}

            {cancellable && (
              <Button
                type="button"
                variant="destructive"
                className="w-full gap-2"
                onClick={() => setShowCancelDialog(true)}
                disabled={isBusy}
              >
                <Ban className="h-4 w-4" />
                لغو خرید
              </Button>
            )}

            {lockReason && (
              <p className="text-xs text-muted-foreground text-center px-2">
                {lockReason}
              </p>
            )}
          </div>
        </div>
      </form>

      {/* دیالوگ حذف کامل */}
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

      {/* دیالوگ لغو */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>لغو خرید</AlertDialogTitle>
            <AlertDialogDescription>
              این خرید ارسال شده ولی هنوز چیزی از آن در انبار دریافت نشده است.
              با لغو، وضعیت آن به «لغو شده» تغییر می‌کند و سابقه‌ی آن حفظ می‌شود.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={statusMutation.isPending}>
              انصراف
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={statusMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {statusMutation.isPending ? "در حال لغو..." : "لغو خرید"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
