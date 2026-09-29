import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Trash2, Ban } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { usePurchaseFormStore } from "@/features/purchases/orders/store/purchaseFormStore";
import {
  useUpdatePurchaseMutation,
  useChangePurchaseStatusMutation,
  useRemovePurchaseMutation,
  usePurchasePaymentMutations,
} from "@/features/purchases/orders/services/mutations";
import { useSuppliersOptionsQuery } from "@/features/suppliers/services/queries";
import { useProductsOptionsQuery } from "@/features/warehouse/products/services/queries";
import PurchaseSupplierSection from "../components/forms/PurchaseSupplierSection";
import PurchaseItemsSection from "../components/forms/PurchaseItemsSection";
import PurchasePaymentsCard from "../components/forms/PurchasePaymentsCard";
import CancelPurchaseDialog from "../components/forms/CancelPurchaseDialog";
import OrderInfoSection from "@/shared/components/forms/OrderInfoSection";
import OrderPaymentSection from "@/shared/components/forms/OrderPaymentSection";
import StatusChoice from "@/shared/components/forms/StatusChoice";
import DocumentFormLayout, {
  DocumentMobileBar,
  DocumentSummaryCard,
} from "@/shared/components/forms/DocumentFormLayout";
import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";
import InvoiceDocumentSection from "@/shared/components/invoice/InvoiceDocumentSection";
import { useInvoiceAttachments } from "@/shared/components/invoice/useInvoiceAttachments";
import { useReturnedNewProduct } from "@/shared/components/products/useReturnedNewProduct";
import { useSubPageNavigation } from "@/shared/hooks/useSubPageNavigation";
import { ROUTES } from "@/shared/constants/routes";
import {
  PURCHASE_STATUS_CHOICES,
  canDeletePurchase,
  hasLivePayments,
} from "@/features/purchases/orders/domain/purchaseRules";
import { PURCHASE_STATUSES } from "@/features/purchases/orders/services/constants";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { invoiceTotals } from "@/shared/domain/invoice/lineMath";
import { usePermission } from "@/features/auth/hooks/usePermission";

/**
 * ویرایشِ خریدی که هنوز **پیش‌فاکتور** است — تنها وضعیتی که
 * `UpdatePurchase` می‌پذیرد. خریدِ صادرشده در `PurchaseIssuedView` باز
 * می‌شود.
 *
 * پیش‌فاکتور کالا جابه‌جا نمی‌کند، پس اقلام آزادانه ویرایش می‌شوند.
 * پیش‌پرداخت به تامین‌کننده خرید را قفل نمی‌کند و جدا در کارت
 * «پرداخت‌ها» ثبت می‌شود. خروج از پیش‌فاکتور با انتخابِ «در انتظار
 * ارسال»/«ارسال‌شده» و شماره و تاریخِ فاکتورِ تامین‌کننده است.
 *
 * بعد از ذخیره کاربر روی همین سند می‌ماند (قبلاً به فهرست پرتاب می‌شد)؛
 * اگر پیش‌فاکتور صادر شد، صفحه خودش نمای فاکتورِ صادرشده را نشان می‌دهد.
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

  // ساختِ کالا/تامین‌کننده‌ی تازه از همین فرم؛ ویرایش‌های نذخیره‌شده در
  // store می‌مانند چون نسخه‌ی سند عوض نشده است.
  const { openSubPage, returned } = useSubPageNavigation();

  const { suppliers, isLoading: suppliersLoading } = useSuppliersOptionsQuery();
  const { products, isLoading: productsLoading } = useProductsOptionsQuery();

  /**
   * ضمیمه‌های همین سند. `UpdatePurchase` آرایه را *جایگزین* می‌کند نه
   * اضافه، پس همیشه فهرستِ نهایی فرستاده می‌شود؛ `commit()` بعد از ذخیره‌ی
   * موفق، کلیدهای بی‌صاحب را از باکت پاک می‌کند.
   */
  const attachments = useInvoiceAttachments(purchaseData.attachments || []);

  const updateMutation = useUpdatePurchaseMutation(purchaseData.id);
  const deleteMutation = useRemovePurchaseMutation();
  const statusMutation = useChangePurchaseStatusMutation(purchaseData.id);
  const payments = usePurchasePaymentMutations(purchaseData.id);

  // فرم فقط وقتی از داده‌ی سرور پر می‌شود که سند عوض شود یا نسخه‌ی تازه‌ای
  // از آن برسد (updatedAt). وابستگی عمداً به id/updatedAt است، نه کل آبجکت،
  // تا تغییرات در حال ویرایش کاربر فقط با تغییر واقعی سند بازنویسی شود.
  useEffect(() => {
    initializeFromPurchase(purchaseData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseData.id, purchaseData.updatedAt, initializeFromPurchase]);

  // ضمیمه‌ها هم با همان کلیدِ فرم تازه می‌شوند — وگرنه بعد از ذخیره،
  // لیست روی نسخه‌ی قبلیِ سرور می‌ماند.
  const attachmentsReset = attachments.reset;
  useEffect(() => {
    attachmentsReset(purchaseData.attachments || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchaseData.id, purchaseData.updatedAt, attachmentsReset]);

  useReturnedNewProduct({
    productId: returned?.newProductId,
    getItems: () => usePurchaseFormStore.getState().formData.items || [],
    setItems,
    priceOf: (product) => product.purchasePrice ?? 0,
  });

  if (initializedForId !== `${purchaseData.id}:${purchaseData.updatedAt}`) {
    return null;
  }

  const items = formData.items || [];
  // پیش‌نمایش با قاعده‌ی سرور؛ عددِ نهایی همان است که سرور پس از ذخیره برمی‌گرداند.
  const totals = invoiceTotals(items);

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

  const onSubmit = (e) => {
    e.preventDefault();

    if (!formData.supplierId) {
      setShowErrors(true);
      toast.error("تامین‌کننده را انتخاب کنید.");
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
      paymentDate: formData.paymentDate || null,
      description: formData.description || "",
      items,
      paymentType: formData.paymentType ?? PaymentTypeEnum.CASH,
      status: selectedStatus,
      attachments: attachments.filesPayload,
    };

    updateMutation.mutate(payload, {
      onSuccess: (updated) => {
        attachments.commit();
        // همین‌جا از پاسخِ سرور پر می‌شود؛ منتظرِ عوض‌شدنِ `updatedAt` نمی‌ماند.
        resetForm();
        if (updated) initializeFromPurchase(updated);
      },
    });
  };

  const handleDiscard = () => {
    attachments.discard();
    resetForm();
    navigate(ROUTES.PURCHASES);
  };

  const handleDelete = () => {
    deleteMutation.mutate(purchaseData.id, {
      onSuccess: () => resetForm(),
    });
  };

  const handleCancelPurchase = () => {
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
  const submitLabel = leavingProforma ? "ذخیره و صدور فاکتور" : "ذخیره‌ی پیش‌فاکتور";

  return (
    <>
      <DocumentFormLayout
        onSubmit={onSubmit}
        main={
          <>
            <PurchaseSupplierSection
              suppliers={suppliers}
              isLoading={suppliersLoading}
              selectedId={formData.supplierId}
              onSelect={(id, name) => {
                setFormData({ supplierId: id, supplierName: name });
                setShowErrors(false);
              }}
              onClear={() => setFormData({ supplierId: "", supplierName: "" })}
              onAddNew={() => openSubPage(ROUTES.SUPPLIERS_NEW)}
              error={
                showErrors && !formData.supplierId ? "انتخاب تامین‌کننده الزامی است" : null
              }
            />
            <PurchaseItemsSection
              items={items}
              products={products}
              isLoadingProducts={productsLoading}
              onItemsChange={setItems}
              onAddNewProduct={() => openSubPage(ROUTES.WAREHOUSE_PRODUCTS_NEW)}
            />
            <OrderInfoSection
              formData={formData}
              onFormChange={setFormData}
              errors={infoErrors}
            />
            {/* در مرحله‌ی پیش‌فاکتور، فاکتور رسمی هنوز نرسیده؛ چیزی که
                ضمیمه می‌شود پیش‌فاکتورِ تامین‌کننده است. `documentKind`
                عمداً داده نشده: فاکتورِ خرید را سرور نمی‌سازد — همان برگه‌ای
                است که تامین‌کننده فرستاده و چاپ/دانلود روی همان است. */}
            <InvoiceDocumentSection
              title="پیش‌فاکتور خرید"
              invoiceNumber={formData.invoiceNumber}
              attachments={attachments}
              attachmentLabel="پیش‌فاکتور یا فاکتور دریافتی از تامین‌کننده"
            />
          </>
        }
        aside={
          <>
            {canUpdate && (
              <DocumentSummaryCard
                itemCount={items.length}
                totals={totals}
                submitLabel={submitLabel}
                isBusy={isBusy}
                onCancel={handleDiscard}
              >
                <StatusChoice
                  options={PURCHASE_STATUS_CHOICES}
                  value={selectedStatus}
                  onChange={(next) => setFormData({ status: next })}
                />
              </DocumentSummaryCard>
            )}

            <OrderPaymentSection
              formData={formData}
              onFormChange={setFormData}
              totalAmount={totals.totalAmount}
              errors={{}}
              termsOnly
            />

            <PurchasePaymentsCard
              purchase={purchaseData}
              payments={payments}
              canManage={allow("PurchasePayment")}
              notice="پیش‌پرداخت، خرید را از پیش‌فاکتور خارج نمی‌کند؛ همان لحظه روی حساب تامین‌کننده می‌نشیند."
            />

            {deletable && allow("PurchaseDelete") && (
              <Button
                type="button"
                variant="ghost"
                className="w-full gap-2 text-destructive hover:bg-destructive/10"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isBusy}
              >
                <Trash2 className="h-4 w-4" />
                حذف پیش‌فاکتور
              </Button>
            )}

            {livePayments && canUpdate && (
              <div className="space-y-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full gap-2 text-destructive hover:bg-destructive/10"
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
              </div>
            )}
          </>
        }
        mobileBar={
          canUpdate && (
            <DocumentMobileBar
              total={totals.totalAmount}
              submitLabel={submitLabel}
              isBusy={isBusy}
            />
          )
        }
      />

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="حذف پیش‌فاکتور خرید"
        description="آیا از حذف این پیش‌فاکتور اطمینان دارید؟ سندِ حذف‌شده دیگر در فهرست خریدها دیده نمی‌شود."
        confirmLabel="حذف"
        pendingLabel="در حال حذف..."
        isPending={deleteMutation.isPending}
        onConfirm={handleDelete}
      />

      <CancelPurchaseDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        isPending={statusMutation.isPending}
        onConfirm={handleCancelPurchase}
      />
    </>
  );
}
