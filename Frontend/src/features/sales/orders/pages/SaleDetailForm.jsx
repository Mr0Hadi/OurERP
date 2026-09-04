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
const RETURNABLE_STATUSES = [
  SaleStatusEnum.SHIPPED,
  SaleStatusEnum.PARTIALLY_DELIVERED,
  SaleStatusEnum.DELIVERED,
];

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

  const computedTotal = items.reduce((sum, item) => {
    const base = (item.quantity || 0) * (item.unitPrice || 0);
    const disc = (base * (item.discount || 0)) / 100;
    return sum + base - disc;
  }, 0);

  // وضعیتِ *ذخیره‌شده* — نه انتخابِ در حال ویرایش؛ عنوان کارت سند باید
  // به فروشِ روی سرور واکنش نشان بدهد، نه به مقدارِ موقتِ فرم.
  const isProforma = isSaleProforma(saleData.status);

  const selectedStatus =
    formData.status === "" || formData.status == null
      ? SaleStatusEnum.PROFORMA
      : Number(formData.status);

  /**
   * قاعده‌ی بکند برای فروش (`CreateSaleCommandHandler`/
   * `UpdateSaleCommandHandler`): خروج از پیش‌فاکتور *دستی نیست*. اگر
   * `paidAmount >= totalAmount` باشد، خودِ سرور شماره‌ی فاکتور را
   * می‌سازد، تاریخ می‌زند و وضعیت را به «آماده‌سازی انبار» می‌برد؛ و
   * تلاش برای بردنِ دستیِ یک پیش‌فاکتورِ پرداخت‌نشده به وضعیتی دیگر با
   * خطای اعتبارسنجی رد می‌شود. پس همین‌جا هم جلویش گرفته می‌شود تا
   * کاربر به‌جای خطای سرور، دلیل را کنارِ فیلد ببیند.
   */
  const paidAmount = Number(formData.paidAmount) || 0;
  const isFullyPaid = computedTotal > 0 && paidAmount >= computedTotal;
  const proformaLocked = isProforma && !isFullyPaid;

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

    if (proformaLocked && selectedStatus !== SaleStatusEnum.PROFORMA) {
      toast.error(
        "تا تسویه‌ی کاملِ مشتری، فروش از «پیش‌فاکتور» خارج نمی‌شود؛ با ثبتِ پرداختِ کامل، فاکتور رسمی خودکار صادر می‌شود.",
      );
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
        lineTotal: item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100),
      })),
      paymentType: formData.paymentType ?? PaymentTypeEnum.CASH,
      paidAmount: Number(formData.paidAmount) || 0,
      checkNumber: formData.checkNumber || null,
      transferRef: formData.transferRef || null,
      mixedPayments: formData.mixedPayments || [],
      // سندی که هنوز شماره‌ی فاکتور رسمی ندارد در مرحله‌ی پیش‌فاکتور
      // است؛ ذخیره‌ی ساده‌ی فرم نباید آن را جلو ببرد.
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
            <SaleItemsSection
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
              invoiceDate={formData.invoiceDate}
              partyLabel="مشتری"
              partyName={formData.customerName}
              items={items}
              totalAmount={computedTotal}
              attachments={attachments}
              documentKind="sale"
              documentId={saleData.id}
              attachmentLabel={
                isProforma
                  ? "پیش‌فاکتور ارسال‌شده برای مشتری"
                  : "فاکتور صادرشده برای مشتری"
              }
            />

            <OrderLogisticsSection
              title="ارسال و حمل"
              drivers={saleData.drivers}
              notes={saleData.shippingNotes}
              notesLabel="یادداشت‌های ارسال"
            />

            <SaleStatusSection
              status={formData.status}
              selectedStatus={formData.status}
              onStatusChange={(val) => setFormData({ status: val })}
              proformaLocked={proformaLocked}
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
