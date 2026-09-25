import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Save, X, Trash2, Ban } from "lucide-react";

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
  useChangePurchaseStatusMutation,
  useRemovePurchaseMutation,
  usePurchasePaymentMutations,
} from "@/features/purchases/orders/services/mutations";
import { useSuppliersQuery } from "@/features/suppliers/services/queries";
import PurchaseSupplierSection from "../components/forms/PurchaseSupplierSection";
import PurchaseItemsSection from "../components/forms/PurchaseItemsSection";
import OrderInfoSection from "@/shared/components/forms/OrderInfoSection";
import OrderPaymentSection from "@/shared/components/forms/OrderPaymentSection";
import PurchaseStatusSection from "../components/forms/PurchaseStatusSection";
import InvoiceDocumentSection from "@/shared/components/invoice/InvoiceDocumentSection";
import { useInvoiceAttachments } from "@/shared/components/invoice/useInvoiceAttachments";
import { ROUTES } from "@/shared/constants/routes";
import { useProductsQuery } from "@/features/warehouse/products/services/queries";
import {
  canDeletePurchase,
  hasLivePayments,
} from "@/features/purchases/orders/domain/purchaseRules";
import { PURCHASE_STATUSES } from "@/features/purchases/orders/services/constants";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { invoiceTotals } from "@/shared/domain/invoice/lineMath";
import { usePermission } from "@/features/auth/hooks/usePermission";
import PurchasePaymentsCard from "../components/forms/PurchasePaymentsCard";

const ALL_FILTERS = {};
const PAGINATION = { pageIndex: 0, pageSize: 200 };
const SORTING = { id: "name", desc: false };

/**
 * ویرایشِ خریدی که هنوز **پیش‌فاکتور** است — تنها وضعیتی که
 * `UpdatePurchase` می‌پذیرد. خریدِ صادرشده در `PurchaseIssuedView` باز
 * می‌شود.
 *
 * پیش‌فاکتور کالا جابه‌جا نمی‌کند، پس اقلام آزادانه ویرایش می‌شوند.
 * پیش‌پرداخت به تامین‌کننده خرید را قفل نمی‌کند و جدا در کارت
 * «پرداخت‌ها» ثبت می‌شود. خروج از پیش‌فاکتور با انتخابِ «در انتظار
 * ارسال»/«ارسال‌شده» و شماره و تاریخِ فاکتورِ تامین‌کننده است.
 */
export default function PurchaseDetailForm({ purchaseData }) {
  const navigate = useNavigate();
  const { can, isError: permissionsUnknown } = usePermission();
  // اگر فهرستِ دسترسی نیامد، دکمه‌ها می‌مانند و خودِ سرور ۴۰۳ می‌دهد.
  const allow = (permission) => permissionsUnknown || can(permission);

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

  const { data: suppliersData, isLoading: suppliersLoading } =
    useSuppliersQuery(ALL_FILTERS, PAGINATION, SORTING);
  const { data: productsData, isLoading: productsLoading } = useProductsQuery(
    ALL_FILTERS,
    PAGINATION,
    SORTING,
  );

  const suppliers = suppliersData?.items || [];
  const products = productsData?.items || [];

  /**
   * ضمیمه‌های همین سند. `UpdatePurchase` آرایه را *جایگزین* می‌کند نه
   * اضافه (بند ۲.۲ سندِ ضمیمه)، پس همیشه فهرستِ نهایی فرستاده می‌شود؛
   * `commit()` بعد از ذخیره‌ی موفق، کلیدهای بی‌صاحب را از باکت پاک می‌کند.
   */
  const attachments = useInvoiceAttachments(purchaseData.attachments || []);

  const updateMutation = useUpdatePurchaseMutation(purchaseData.id);
  const deleteMutation = useRemovePurchaseMutation();
  const statusMutation = useChangePurchaseStatusMutation(purchaseData.id);
  const payments = usePurchasePaymentMutations(purchaseData.id);

  const items = formData.items || [];

  /**
   * انتخابِ فعلیِ وضعیت (نه وضعیتِ ذخیره‌شده) — قاعده‌های خروج از
   * پیش‌فاکتور روی همین سنجیده می‌شوند.
   */
  const selectedStatus =
    formData.status === "" || formData.status == null
      ? PURCHASE_STATUSES.PROFORMA
      : Number(formData.status);

  const leavingProforma = selectedStatus !== PURCHASE_STATUSES.PROFORMA;
  const missingInvoiceNumber = !String(formData.invoiceNumber || "").trim();
  const missingInvoiceDate = !formData.invoiceDate;

  const infoErrors =
    showErrors && leavingProforma
      ? {
          invoiceNumber: missingInvoiceNumber
            ? "برای خروج از پیش‌فاکتور، شماره فاکتور تامین‌کننده الزامی است"
            : null,
          invoiceDate: missingInvoiceDate
            ? "برای خروج از پیش‌فاکتور، تاریخ فاکتور الزامی است"
            : null,
        }
      : {};

  // پیش‌نمایش با قاعده‌ی سرور؛ عددِ نهایی همان است که سرور پس از ذخیره برمی‌گرداند.
  const computedTotal = invoiceTotals(items).totalAmount;

  // initializeFromPurchase باید فقط یک‌بار هنگام mount اجرا شود
  useEffect(() => {
    initializeFromPurchase(purchaseData);
  }, [purchaseData.id, purchaseData.updatedAt, initializeFromPurchase]);

  // ضمیمه‌ها هم با همان کلیدِ فرم تازه می‌شوند — وگرنه بعد از ذخیره،
  // لیست روی نسخه‌ی قبلیِ سرور می‌ماند.
  const attachmentsReset = attachments.reset;
  useEffect(() => {
    attachmentsReset(purchaseData.attachments || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseData.id, purchaseData.updatedAt, attachmentsReset]);

  if (initializedForId !== `${purchaseData.id}:${purchaseData.updatedAt}`) {
    return null;
  }

  const onSubmit = (e) => {
    e.preventDefault();

    if (!formData.supplierId) {
      setShowErrors(true);
      return;
    }

    // آپلودِ نیمه‌کاره کلید ندارد و در payload نمی‌آید؛ ذخیره در این
    // لحظه یعنی ضمیمه‌ی گم‌شده.
    if (attachments.isUploading) {
      toast.error("تا پایان بارگذاری ضمیمه‌ها صبر کنید.");
      return;
    }

    if (items.length === 0) {
      toast.error("خرید باید دست‌کم یک قلم داشته باشد.");
      return;
    }

    // قاعده‌ی بکند: خروج از پیش‌فاکتور یعنی فاکتور رسمیِ تامین‌کننده
    // رسیده، پس شماره و تاریخش باید ثبت شده باشد.
    if (leavingProforma && (missingInvoiceNumber || missingInvoiceDate)) {
      setShowErrors(true);
      toast.error(
        "برای خروج از پیش‌فاکتور، شماره و تاریخ فاکتور تامین‌کننده را وارد کنید.",
      );
      return;
    }

    const payload = {
      supplierId: formData.supplierId,
      invoiceNumber: formData.invoiceNumber,
      invoiceDate: formData.invoiceDate,
      dueDate: formData.dueDate || null,
      description: formData.description || "",
      items,
      paymentType: formData.paymentType ?? PaymentTypeEnum.CASH,
      status: selectedStatus,
      attachments: attachments.filesPayload,
    };

    updateMutation.mutate(payload, {
      onSuccess: () => {
        attachments.commit();
        resetForm();
        navigate(ROUTES.PURCHASES);
      },
    });
  };

  const handleDelete = () => {
    deleteMutation.mutate(purchaseData.id, {
      onSuccess: () => resetForm(),
    });
  };

  const handleCancel = () => {
    statusMutation.mutate(PURCHASE_STATUSES.CANCELLED, {
      onSuccess: () => {
        setShowCancelDialog(false);
        resetForm();
      },
    });
  };

  // پیش‌فاکتوری که پیش‌پرداختِ زنده دارد حذف نمی‌شود (سرور ۴۰۰ می‌دهد)؛
  // یا پرداخت‌ها ابطال شوند یا خرید لغو شود.
  const livePayments = hasLivePayments(purchaseData);
  const deletable = canDeletePurchase(purchaseData) && !livePayments;
  const canUpdate = allow("PurchaseUpdate");

  const isBusy =
    updateMutation.isPending ||
    deleteMutation.isPending ||
    statusMutation.isPending ||
    attachments.isUploading;

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
              errors={infoErrors}
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
            <OrderPaymentSection
              formData={formData}
              onFormChange={setFormData}
              totalAmount={computedTotal}
              errors={{}}
              termsOnly
            />

            <PurchasePaymentsCard
              purchase={purchaseData}
              payments={payments}
              canManage={allow("PurchasePayment")}
              notice="پیش‌پرداخت، خرید را از پیش‌فاکتور خارج نمی‌کند؛ همان لحظه روی حساب تامین‌کننده می‌نشیند."
            />

            {/* در مرحله‌ی پیش‌فاکتور، فاکتور رسمی هنوز نرسیده؛ چیزی
                که ضمیمه می‌شود پیش‌فاکتورِ تامین‌کننده است.

                `documentKind` عمداً داده نشده: فاکتور خرید را سرور
                نمی‌سازد — همان برگه‌ای است که تامین‌کننده فرستاده و
                اینجا ضمیمه شده، و چاپ/دانلود روی همان انجام می‌شود. */}
            <InvoiceDocumentSection
              title="پیش‌فاکتور خرید"
              invoiceNumber={formData.invoiceNumber}
              attachments={attachments}
              attachmentLabel="پیش‌فاکتور یا فاکتور دریافتی از تامین‌کننده"
            />

            <PurchaseStatusSection
              selectedStatus={formData.status}
              savedStatus={purchaseData.status}
              onStatusChange={(val) => setFormData({ status: val })}
            />

            {canUpdate && (
              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1 gap-2"
                  disabled={isBusy}
                >
                  <Save className="h-4 w-4" />
                  {updateMutation.isPending
                    ? "در حال ذخیره..."
                    : "به‌روزرسانی پیش‌فاکتور"}
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
            )}

            {deletable && allow("PurchaseDelete") && (
              <Button
                type="button"
                variant="destructive"
                className="w-full gap-2"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isBusy}
              >
                <Trash2 className="h-4 w-4" />
                حذف پیش‌فاکتور
              </Button>
            )}

            {livePayments && canUpdate && (
              <>
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
                <p className="text-xs text-muted-foreground text-center px-2">
                  این پیش‌فاکتور پیش‌پرداخت دارد و حذف نمی‌شود؛ یا پرداخت‌ها را
                  باطل کنید یا خرید را لغو کنید.
                </p>
              </>
            )}
          </div>
        </div>
      </form>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف پیش‌فاکتور خرید</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف این پیش‌فاکتور اطمینان دارید؟ سندِ حذف‌شده دیگر در
              فهرست خریدها دیده نمی‌شود.
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

      <CancelPurchaseDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        isPending={statusMutation.isPending}
        onConfirm={handleCancel}
      />
    </div>
  );
}

/** لغوِ خرید — نهایی است؛ پرداخت‌ها روی خرید می‌مانند. */
export function CancelPurchaseDialog({
  open,
  onOpenChange,
  isPending,
  onConfirm,
}) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => !isPending && onOpenChange(next)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>لغو خرید</AlertDialogTitle>
          <AlertDialogDescription>
            لغو نهایی است و قابل بازگشت نیست. پرداخت‌های انجام‌شده روی خرید
            می‌مانند؛ پولی که تامین‌کننده برمی‌گرداند را با «پول برگشتی» در کارت
            پرداخت‌ها ثبت کنید.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>انصراف</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "در حال لغو..." : "لغو خرید"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
