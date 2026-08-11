import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Save, X, Trash2, Undo2 } from "lucide-react";

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
import { useSaleFormStore } from "@/features/sales/orders/store/saleFormStore";
import {
  useUpdateSaleMutation,
  useRemoveSaleMutation,
} from "@/features/sales/orders/services/mutations";
import { useCustomersQuery } from "@/features/customers/services/queries";
import { useProductsQuery } from "@/features/warehouse/products/services/queries";
import { ROUTES } from "@/shared/constants/routes";

import SaleCustomerSection from "../components/forms/SaleCustomerSection";
import SaleItemsSection from "../components/forms/SaleItemsSection";
import SaleInfoSection from "../components/forms/SaleInfoSection";
import SalePaymentSection from "../components/forms/SalePaymentSection";
import SaleStatusSection from "../components/forms/SaleStatusSection";

const ALL_FILTERS = {};
const PAGINATION = { pageIndex: 0, pageSize: 200 };
const SORTING = { id: "name", desc: false };

// وضعیت‌هایی که ثبت مرجوعی از روی آن‌ها ممکن است.
const RETURNABLE_STATUSES = ["shipped", "partially_delivered", "delivered"];

export default function SaleDetailForm({ saleData }) {
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

  const { data: customersData, isLoading: customersLoading } =
    useCustomersQuery(ALL_FILTERS, PAGINATION, SORTING);
  const { data: productsData, isLoading: productsLoading } = useProductsQuery(
    ALL_FILTERS,
    PAGINATION,
    SORTING,
  );

  const customers = customersData?.items || [];
  const products = productsData?.items || [];

  const updateMutation = useUpdateSaleMutation(saleData.id);
  const deleteMutation = useRemoveSaleMutation();

  const items = formData.items || [];

  // initializeFromSale باید فقط یک‌بار هنگام mount اجرا شود
  useEffect(() => {
    initializeFromSale(saleData);
  }, [saleData.id, saleData.updatedAt, initializeFromSale]);

  if (initializedForId !== `${saleData.id}:${saleData.updatedAt}`) {
    return null;
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
      mixedPayments: formData.mixedPayments || [],
      status: formData.status || "processing",
      totalAmount: computedTotal,
    };

    updateMutation.mutate(payload, {
      onSuccess: () => navigate(ROUTES.SALES),
    });
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
                onClick={() => navigate(-1)}
                disabled={isBusy}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                انصراف
              </Button>
            </div>

            {RETURNABLE_STATUSES.includes(saleData.status) && (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() =>
                  navigate(`${ROUTES.SALES_RETURNS_NEW}?saleId=${saleData.id}`)
                }
                disabled={isBusy}
              >
                <Undo2 className="h-4 w-4" />
                ثبت مرجوعی از این فروش
              </Button>
            )}

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
