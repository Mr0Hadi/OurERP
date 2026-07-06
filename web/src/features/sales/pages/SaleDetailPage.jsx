// src/features/sales/pages/SaleDetailPage.jsx
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
import { useSaleFormStore } from "#/features/sales/store/saleFormStore";
import { useSaleQuery } from "#/features/sales/services/queries";
import { useUpdateSaleMutation } from "#/features/sales/services/mutations";
import { useCustomersQuery } from "#/features/customers/services/queries";
import { useProductsQuery } from "#/features/warehouse/services/queries";
import { useRemoveSaleMutation } from "#/features/sales/services/mutations";

import SaleCustomerSection from "../components/forms/SaleCustomerSection";
import SaleItemsSection from "../components/forms/SaleItemsSection";
import SaleInfoSection from "../components/forms/SaleInfoSection";
import SalePaymentSection from "../components/forms/SalePaymentSection";
import SaleDetailLoading from "../components/forms/SaleDetailLoading";
import SaleStatusSection from "../components/forms/SaleStatusSection";
import { ROUTES } from "@/shared/constants/routes";

const ALL_FILTERS = {};
const PAGINATION = { pageIndex: 0, pageSize: 200 };
const SORTING = { id: "name", desc: false };

// ============================================================
// کامپوننت فرم — جدا از صفحه اصلی
// ============================================================
function SaleDetailForm({ saleData }) {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const {
    setFormData,
    setItems,
    resetForm,
    formData,
    initializeFromSale,
    initializedForId,
  } = useSaleFormStore();

  // initializeFromSale باید فقط یک‌بار هنگام mount اجرا شود

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
  const deleteMutation = useRemoveSaleMutation();

  const items = formData.items || [];

  useEffect(() => {
    initializeFromSale(saleData);
  }, [saleData.id, initializeFromSale]);

  if (initializedForId !== saleData.id) {
    return null; // یا می‌توانید <SaleDetailLoading /> برگردانید
  }

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
      onSuccess: () => navigate(ROUTES.SALES),
    });
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const handleDelete = () => {
    deleteMutation.mutate(saleData.id, {
      onSuccess: () => {
        resetForm();
        navigate(ROUTES.SALES);
      },
    });
  };

  const isBusy = updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in zoom-in-95 duration-300">
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <SaleItemsSection
              items={items}
              products={products}
              isLoadingProducts={productsLoading}
              onItemsChange={setItems}
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
              error={
                showErrors && !formData.customerId
                  ? "انتخاب مشتری الزامی است"
                  : null
              }
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
              <Button type="submit" className="flex-1 gap-2" disabled={isBusy}>
                <Save className="h-4 w-4" />
                {updateMutation.isPending
                  ? "در حال ذخیره..."
                  : "به‌روزرسانی فروش"}
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

            <Button
              type="button"
              variant="destructive"
              className="w-full gap-2"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isBusy}
            >
              <Trash2 className="h-4 w-4" />
              حذف فروش
            </Button>
          </div>
        </div>
      </form>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف فروش</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف این فروش اطمینان دارید؟ این عملیات اطلاعات فروش ثبت شده
              را به طور کامل حذف میکند.
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
// صفحه اصلی
// ============================================================
export default function SaleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const setHeader = useHeaderStore((s) => s.setHeader);
  const clearHeader = useHeaderStore((s) => s.clearHeader);

  const {
    data: sale,
    isLoading: saleLoading,
    isError: saleError,
  } = useSaleQuery(id);

  useEffect(() => {
    setHeader({
      title: saleLoading ? "در حال بارگذاری..." : sale ? "ویرایش فروش" : "خطا",
      showBack: true,
      onBack: () => navigate(-1),
    });
    return () => clearHeader();
  }, [setHeader, clearHeader, navigate, sale, saleLoading]);

  if (saleLoading) return <SaleDetailLoading />;

  if (saleError || !sale) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg text-muted-foreground">
          {saleError
            ? "خطا در بارگذاری اطلاعات"
            : "فروشی با این شناسه یافت نشد."}
        </p>
        <Button variant="outline" onClick={() => navigate(ROUTES.SALES)}>
          بازگشت به لیست
        </Button>
      </div>
    );
  }

  return <SaleDetailForm key={sale.id} saleData={sale} />;
}
