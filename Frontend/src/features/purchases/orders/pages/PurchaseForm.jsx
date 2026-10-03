import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Ban, Trash2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { usePurchaseFormStore } from "@/features/purchases/orders/store/purchaseFormStore";
import {
  useChangePurchaseStatusMutation,
  useCreatePurchaseMutation,
  usePurchaseChangesSaver,
  useRemovePurchaseMutation,
} from "@/features/purchases/orders/services/mutations";
import { useProductsOptionsQuery } from "@/features/warehouse/products/services/queries";
import {
  PURCHASE_SHIPPING_STATUSES,
  canDeletePurchase,
  missingInvoiceFields,
} from "@/features/purchases/orders/domain/purchaseRules";
import { PURCHASE_PAYMENT_SIDE } from "@/features/purchases/orders/domain/purchasePayments";
import { PURCHASE_STATUSES } from "@/features/purchases/orders/services/constants";
import PurchaseSupplierSection from "../components/forms/PurchaseSupplierSection";
import PurchaseItemsSection from "../components/forms/PurchaseItemsSection";
import CancelPurchaseDialog from "../components/forms/CancelPurchaseDialog";
import DocumentFormLayout, {
  FormSection,
  OrderSummaryCard,
} from "@/shared/components/forms/DocumentFormLayout";
import OrderInfoCard from "@/shared/components/forms/OrderInfoCard";
import PaymentsCard from "@/shared/components/payments/PaymentsCard";
import InvoiceDocumentSection from "@/shared/components/invoice/InvoiceDocumentSection";
import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";
import { paymentTypeOf, usePaymentDraft } from "@/shared/components/payments/usePaymentDraft";
import { useInvoiceAttachments } from "@/shared/components/invoice/useInvoiceAttachments";
import { useReturnedNewProduct } from "@/shared/components/products/useReturnedNewProduct";
import { useDocumentFormDraft } from "@/shared/hooks/useDocumentFormDraft";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { usePurchaseStatusLabels } from "@/shared/services/enums/queries";
import { scrollToSection } from "@/shared/lib/scrollToSection";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { invoiceTotals } from "@/shared/domain/invoice/lineMath";

/**
 * فرمِ خرید — ثبتِ تازه (`purchase` خالی) و ویرایشِ پیش‌فاکتور (تنها وضعیتی
 * که `UpdatePurchase` می‌پذیرد). خریدِ صادرشده در `PurchaseIssuedView` باز
 * می‌شود.
 *
 * چیدمان همان نمای فاکتورِ صادرشده است: تامین‌کننده ← اقلام ← پرداخت‌ها در ستونِ
 * اصلی؛ جمع و دکمه‌ی ثبت ← اطلاعاتِ فاکتور ← سند و پیوست در ستونِ کناری.
 *
 *  - پیش‌فاکتور: شماره، تاریخ، سررسید و پرداخت ندارد؛ اقلام بعداً هم عوض می‌شوند.
 *  - فاکتور: شماره و تاریخِ فاکتورِ تامین‌کننده الزامی؛ «در انتظار ارسال» یا
 *    «ارسال شده»؛ پرداخت‌ها (نقدی، انتقال، چک یا ترکیبی) همراهِ همان ثبت.
 *
 * بعد از ثبت، خودِ سند باز می‌شود؛ ذخیره‌ی پیش‌فاکتور روی همان سند می‌ماند.
 */
export default function PurchaseForm({ purchase }) {
  const isNew = !purchase;
  const navigate = useNavigate();
  const { allows } = usePermission();
  const statusLabels = usePurchaseStatusLabels();
  const [showErrors, setShowErrors] = useState(false);
  const [dialog, setDialog] = useState(null); // "delete" | "cancel"

  const store = usePurchaseFormStore();
  const { formData, setFormData, setItems, setPaymentDraft, resetForm } = store;
  const { openSubPage, returned, ready } = useDocumentFormDraft({
    doc: purchase,
    initializedForId: store.initializedForId,
    reset: resetForm,
    initializeNew: store.initializeForNew,
    initializeFrom: store.initializeFromPurchase,
  });

  /**
   * ضمیمه‌ی پیش‌فاکتور/فاکتورِ تامین‌کننده. `UpdatePurchase` آرایه را *جایگزین*
   * می‌کند، پس همیشه فهرستِ نهایی فرستاده می‌شود.
   */
  const attachments = useInvoiceAttachments(purchase?.attachments || []);
  const attachmentsReset = attachments.reset;
  useEffect(() => {
    if (purchase) attachmentsReset(purchase.attachments || []);
    // با همان کلیدِ فرم تازه می‌شود.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [purchase?.id, purchase?.updatedAt, attachmentsReset]);

  // پرداخت‌ها تا دکمه‌ی ثبت در پیش‌نویس می‌مانند؛ در store، تا رفتن به «کالای
  // جدید» پاکشان نکند.
  const payments = usePaymentDraft(purchase?.paymentDetails || [], PURCHASE_PAYMENT_SIDE.direction, [
    formData.paymentDraft,
    setPaymentDraft,
  ]);

  const createMutation = useCreatePurchaseMutation();
  const saver = usePurchaseChangesSaver(purchase?.id);
  const deleteMutation = useRemovePurchaseMutation();
  const statusMutation = useChangePurchaseStatusMutation(purchase?.id);
  const { products, isLoading: productsLoading } = useProductsOptionsQuery();

  // تامین‌کننده‌ای که از داخلِ همین فرم ساخته شد (تا بکند شناسه را برگرداند —
  // بندِ ۹.۲ سندِ درخواست‌ها — عملاً اجرا نمی‌شود). نام را انتخابگر از سرور می‌خواند.
  const newSupplierId = returned?.newSupplierId;
  useEffect(() => {
    if (newSupplierId) setFormData({ supplierId: newSupplierId, supplierName: "" });
  }, [newSupplierId, setFormData]);

  useReturnedNewProduct({
    productId: returned?.newProductId,
    getItems: () => usePurchaseFormStore.getState().formData.items || [],
    setItems,
    priceOf: (product) => product.purchasePrice ?? 0,
  });

  if (!ready) return null;

  const items = formData.items || [];
  // پیش‌نمایش با قاعده‌ی سرور؛ جمع فرستاده نمی‌شود و سرور خودش حساب می‌کند.
  const totals = invoiceTotals(items);

  const status =
    formData.status === "" || formData.status == null
      ? PURCHASE_STATUSES.PROFORMA
      : Number(formData.status);
  const isInvoice = status !== PURCHASE_STATUSES.PROFORMA;
  const invoiceErrors = missingInvoiceFields(formData, status);
  // پیش‌پرداختِ قدیمی روی پیش‌فاکتور (پیش از قفلِ پیش‌فاکتور ممکن بود).
  const hasPrepayments = (purchase?.paymentDetails || []).some((payment) => !payment.voidedAt);

  const onSubmit = (e) => {
    e.preventDefault();
    if (!formData.supplierId) {
      setShowErrors(true);
      toast.error("تامین‌کننده را انتخاب کنید.");
      return scrollToSection("party");
    }
    if (items.length === 0) {
      toast.error("دست‌کم یک کالا اضافه کنید.");
      return scrollToSection("items");
    }
    if (invoiceErrors) {
      setShowErrors(true);
      toast.error("برای فاکتور، شماره و تاریخِ فاکتور را وارد کنید.");
      return scrollToSection("info");
    }
    // آپلودِ نیمه‌کاره کلید ندارد و در payload نمی‌آید.
    if (attachments.isUploading) {
      toast.error("تا پایان بارگذاری پیوست‌ها صبر کنید.");
      return;
    }

    const payload = {
      supplierId: formData.supplierId,
      supplierName: formData.supplierName,
      // پیش‌فاکتور شماره، تاریخ و سررسید ندارد.
      invoiceNumber: isInvoice ? formData.invoiceNumber : "",
      invoiceDate: isInvoice ? formData.invoiceDate : null,
      paymentDate: isInvoice ? formData.paymentDate || null : null,
      description: formData.description || "",
      items,
      paymentType: paymentTypeOf(isInvoice ? payments.rows : []),
      status,
      attachments: attachments.filesPayload,
    };

    if (isNew) {
      createMutation.mutate(
        { ...payload, paymentRows: isInvoice ? payments.rows : [] },
        {
          onSuccess: (created) => {
            attachments.commit();
            resetForm();
            navigate(
              created?.id ? routeWithId(ROUTES.PURCHASES_DETAIL, created.id) : ROUTES.PURCHASES,
              { replace: true },
            );
          },
        },
      );
      return;
    }

    // اول خودِ سند (صدور هم با همین است)، بعد پرداخت‌ها.
    saver.mutate(
      { update: payload, paymentDraft: isInvoice ? payments : null },
      {
        onSuccess: (latest) => {
          attachments.commit();
          // همین‌جا از پاسخِ سرور پر می‌شود؛ منتظرِ عوض‌شدنِ `updatedAt` نمی‌ماند.
          resetForm();
          if (latest) store.initializeFromPurchase(latest);
        },
      },
    );
  };

  const leave = () => {
    // فایل‌های آپلودشده‌ی این نشست هیچ سندی ندارند که به آن بچسبند.
    attachments.discard();
    resetForm();
    navigate(ROUTES.PURCHASES);
  };

  const canEdit = isNew || allows("PurchaseUpdate");
  // پیش‌فاکتوری که پیش‌پرداختِ زنده دارد حذف نمی‌شود (سرور ۴۰۰ می‌دهد)؛ لغو می‌شود.
  const deletable = !isNew && canDeletePurchase(purchase) && !hasPrepayments && allows("PurchaseDelete");
  const cancellable = !isNew && hasPrepayments && canEdit;

  const isBusy =
    createMutation.isPending ||
    saver.isPending ||
    deleteMutation.isPending ||
    statusMutation.isPending ||
    attachments.isUploading;
  const submitLabel = isNew
    ? isInvoice
      ? "ثبت فاکتور"
      : "ثبت پیش‌فاکتور"
    : isInvoice
      ? "ذخیره و صدور فاکتور"
      : "ذخیره‌ی پیش‌فاکتور";

  return (
    <>
      <DocumentFormLayout
        onSubmit={onSubmit}
        main={
          <>
            <FormSection name="party">
              <PurchaseSupplierSection
                selectedId={formData.supplierId}
                selectedName={formData.supplierName}
                onSelect={(id, name) => setFormData({ supplierId: id, supplierName: name })}
                onClear={() => setFormData({ supplierId: "", supplierName: "" })}
                onAddNew={() => openSubPage(ROUTES.SUPPLIERS_NEW)}
                error={showErrors && !formData.supplierId ? "تامین‌کننده را انتخاب کنید" : null}
              />
            </FormSection>
            <FormSection name="items">
              <PurchaseItemsSection
                items={items}
                products={products}
                isLoadingProducts={productsLoading}
                onItemsChange={setItems}
                onAddNewProduct={() => openSubPage(ROUTES.WAREHOUSE_PRODUCTS_NEW)}
              />
            </FormSection>
            {(isInvoice || hasPrepayments) && (
              <PaymentsCard
                draft={payments}
                side={PURCHASE_PAYMENT_SIDE}
                total={totals.totalAmount}
                canManage={isInvoice && (isNew || allows("PurchasePayment"))}
                allowRefund={false}
                notice={
                  isInvoice ? undefined : "این پیش‌فاکتور پیش‌پرداخت دارد؛ با صدورِ فاکتور قابل اصلاح است."
                }
              />
            )}
          </>
        }
        aside={
          <>
            <FormSection name="info">
              <OrderInfoCard
                kind={isInvoice ? "invoice" : "proforma"}
                onKindChange={(kind) =>
                  setFormData({
                    status: kind === "proforma" ? PURCHASE_STATUSES.PROFORMA : PURCHASE_STATUSES.PENDING,
                  })
                }
                withNumber
                formData={formData}
                onFormChange={setFormData}
                errors={showErrors ? invoiceErrors ?? {} : {}}
                status={{
                  value: status,
                  options: PURCHASE_SHIPPING_STATUSES.map((value) => ({ value, label: statusLabels[value] })),
                  onChange: (next) => setFormData({ status: next }),
                }}
              />
            </FormSection>
            <InvoiceDocumentSection
              title={isInvoice ? "فاکتور" : "پیش‌فاکتور"}
              invoiceNumber={formData.invoiceNumber}
              attachments={attachments}
              attachmentLabel="تصویر یا PDFِ برگه‌ی تامین‌کننده"
            />
            <OrderSummaryCard
              title={isInvoice ? "فاکتور خرید" : "پیش‌فاکتور خرید"}
              itemCount={items.length}
              totals={totals}
              canSubmit={canEdit}
              submitLabel={submitLabel}
              isBusy={isBusy}
              onCancel={leave}
              footer={
                (deletable || cancellable) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDialog(deletable ? "delete" : "cancel")}
                    disabled={isBusy}
                  >
                    {deletable ? <Trash2 className="size-3.5" /> : <Ban className="size-3.5" />}
                    {deletable ? "حذف پیش‌فاکتور" : "لغو خرید"}
                  </Button>
                )
              }
            />
          </>
        }
      />

      {!isNew && (
        <>
          <ConfirmDialog
            open={dialog === "delete"}
            onOpenChange={(open) => !open && setDialog(null)}
            title="حذف پیش‌فاکتور خرید"
            description="سندِ حذف‌شده دیگر در فهرست خریدها دیده نمی‌شود."
            confirmLabel="حذف"
            pendingLabel="در حال حذف..."
            isPending={deleteMutation.isPending}
            onConfirm={() => deleteMutation.mutate(purchase.id, { onSuccess: () => resetForm() })}
          />
          <CancelPurchaseDialog
            open={dialog === "cancel"}
            onOpenChange={(open) => !open && setDialog(null)}
            isPending={statusMutation.isPending}
            onConfirm={() =>
              statusMutation.mutate(PURCHASE_STATUSES.CANCELLED, {
                onSuccess: () => {
                  setDialog(null);
                  resetForm();
                },
              })
            }
          />
        </>
      )}
    </>
  );
}
