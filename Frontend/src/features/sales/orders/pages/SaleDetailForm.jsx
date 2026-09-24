import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
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
import OrderInfoSection from "@/shared/components/forms/OrderInfoSection";
import OrderPaymentSection from "@/shared/components/forms/OrderPaymentSection";
import SaleStatusSection from "../components/forms/SaleStatusSection";
import {
  RETURNABLE_SALE_STATUSES,
  canDeleteSale,
} from "../domain/saleRules";
import OrderItemsReadOnly from "@/shared/components/forms/OrderItemsReadOnly";
import UnitsPageLink from "@/features/warehouse/units/components/UnitsPageLink";
import OrderLogisticsSection from "@/shared/components/forms/OrderLogisticsSection";
import InvoiceDocumentSection from "@/shared/components/invoice/InvoiceDocumentSection";
import { useInvoiceAttachments } from "@/shared/components/invoice/useInvoiceAttachments";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import {
  SaleStatusEnum,
  isSaleProforma,
} from "@/shared/domain/enums/saleStatus";

const ALL_FILTERS = {};
const PAGINATION = { pageIndex: 0, pageSize: 200 };
const SORTING = { id: "name", desc: false };

// وضعیت‌هایی که ثبت مرجوعی از روی آن‌ها ممکن است — یعنی چیزی از انبار
// بیرون رفته باشد. عددی‌اند چون `status` روی سیم همیشه عدد است.

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

  /**
   * ضمیمه‌های همین فروش. `UpdateSale` آرایه را *جایگزین* می‌کند نه اضافه
   * (بند ۲.۲ سندِ ضمیمه)، پس همیشه فهرستِ نهایی فرستاده می‌شود؛
   * `commit()` بعد از ذخیره‌ی موفق، کلیدهای بی‌صاحب را از باکت پاک می‌کند.
   */
  const attachments = useInvoiceAttachments(saleData.attachments || []);

  const updateMutation = useUpdateSaleMutation(saleData.id);
  const deleteMutation = useRemoveSaleMutation();

  const items = formData.items || [];

  // initializeFromSale باید فقط یک‌بار هنگام mount اجرا شود
  useEffect(() => {
    initializeFromSale(saleData);
  }, [saleData.id, saleData.updatedAt, initializeFromSale]);

  // ضمیمه‌ها هم با همان کلیدِ فرم تازه می‌شوند — وگرنه بعد از ذخیره،
  // لیست روی نسخه‌ی قبلیِ سرور می‌ماند.
  const attachmentsReset = attachments.reset;
  useEffect(() => {
    attachmentsReset(saleData.attachments || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleData.id, saleData.updatedAt, attachmentsReset]);

  if (initializedForId !== `${saleData.id}:${saleData.updatedAt}`) {
    return null;
  }

  // وضعیتِ *ذخیره‌شده* — نه انتخابِ در حال ویرایش؛ عنوان کارت سند باید
  // به فروشِ روی سرور واکنش نشان بدهد، نه به مقدارِ موقتِ فرم.
  const isProforma = isSaleProforma(saleData.status);

  // اقلام فقط در پیش‌فاکتور تغییر می‌کنند؛ بعد از آن جمع همان مبلغِ
  // ذخیره‌شده‌ی سرور است (در فروشِ اقساطی هم باید با قرارداد برابر بماند).
  const computedTotal = isProforma
    ? items.reduce((sum, item) => {
        const base = (item.quantity || 0) * (item.unitPrice || 0);
        const disc = (base * (item.discount || 0)) / 100;
        return sum + base - disc;
      }, 0)
    : Number(saleData.totalAmount) || 0;

  const selectedStatus =
    formData.status === "" || formData.status == null
      ? SaleStatusEnum.PROFORMA
      : Number(formData.status);


  const onSubmit = (e) => {
    e.preventDefault();

    if (!formData.customerId) {
      setShowErrors(true);
      return;
    }

    // آپلودِ نیمه‌کاره کلید ندارد و در payload نمی‌آید؛ ذخیره در این
    // لحظه یعنی ضمیمه‌ی گم‌شده.
    if (attachments.isUploading) {
      toast.error("تا پایان بارگذاری ضمیمه‌ها صبر کنید.");
      return;
    }


    const payload = {
      customerId: formData.customerId,
      customerName: formData.customerName,
      invoiceDate: formData.invoiceDate,
      dueDate: formData.dueDate || null,
      description: formData.description || "",
      items: items.map((item) => ({
        ...item,
        lineTotal: item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100),
      })),
      paymentType: formData.paymentType ?? PaymentTypeEnum.CASH,
      paidAmount: Number(formData.paidAmount) || 0,
      checkNumber: formData.checkNumber || null,
      transferRef: formData.transferRef || null,
      mixedPayments: formData.mixedPayments || [],
      paymentPaidAt: formData.paymentPaidAt || null,
      // خروج از پیش‌فاکتور کارِ سرور است (با اولین پرداخت)؛ اینجا فقط
      // قدم‌های دستیِ مجاز (`manualSaleStatusOptions`) فرستاده می‌شوند.
      status: selectedStatus,
      totalAmount: computedTotal,
      attachments: attachments.filesPayload,
    };

    updateMutation.mutate(payload, {
      onSuccess: () => {
        attachments.commit();
        navigate(ROUTES.SALES);
      },
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

  const isBusy =
    updateMutation.isPending || deleteMutation.isPending || attachments.isUploading;

  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-in fade-in zoom-in-95 duration-300">
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {isProforma ? (
              <SaleItemsSection
                items={items}
                products={products}
                isLoadingProducts={productsLoading}
                onItemsChange={setItems}
              />
            ) : (
              <OrderItemsReadOnly
                title="اقلام فروش"
                items={saleData.items}
                headerAction={
                  saleData.items?.some((item) => Number(item.shippedQuantity) > 0) && (
                    <UnitsPageLink
                      params={{ saleId: saleData.id }}
                      label="دانه‌های ارسال‌شده"
                    />
                  )
                }
                columns={[
                  {
                    key: "shipped",
                    label: "ارسال‌شده",
                    render: (item) =>
                      (Number(item.shippedQuantity) || 0).toLocaleString("fa-IR"),
                  },
                ]}
              />
            )}
            <OrderInfoSection
              formData={formData}
              onFormChange={setFormData}
              errors={{}}
              invoiceNumberDisabled
            />

            <OrderLogisticsSection
              title="ارسال و حمل"
              drivers={saleData.drivers}
              notes={saleData.shippingNotes}
              notesLabel="یادداشت‌های ارسال"
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

            <OrderPaymentSection
              formData={formData}
              onFormChange={setFormData}
              totalAmount={computedTotal}
              errors={{}}
            />

            {/* تا وقتی فروش پیش‌فاکتور است، سندِ چاپی و ضمیمه هم
                پیش‌فاکتورند؛ فاکتور رسمی و شماره‌اش را بکند با تغییر
                وضعیت به «آماده‌سازی انبار» می‌سازد. */}
            <InvoiceDocumentSection
              title={isProforma ? "پیش‌فاکتور فروش" : "فاکتور فروش"}
              invoiceNumber={formData.invoiceNumber}
              attachments={attachments}
              documentKind="sale"
              documentId={saleData.id}
              attachmentLabel={
                isProforma
                  ? "پیش‌فاکتور ارسال‌شده برای مشتری"
                  : "فاکتور صادرشده برای مشتری"
              }
            />

            <SaleStatusSection
              sale={saleData}
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
                onClick={() => {
                  attachments.discard();
                  navigate(-1);
                }}
                disabled={isBusy}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                انصراف
              </Button>
            </div>

            {RETURNABLE_SALE_STATUSES.includes(Number(saleData.status)) && (
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

            {canDeleteSale(saleData) ? (
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
            ) : (
              <p className="text-xs text-muted-foreground text-center px-2">
                از این فروش کالا ارسال شده و دیگر قابل حذف نیست؛ برای برگشتِ
                کالا مرجوعی ثبت کنید.
              </p>
            )}
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
