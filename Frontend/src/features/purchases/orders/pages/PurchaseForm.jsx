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
  PURCHASE_KIND_DESCRIPTIONS,
  PURCHASE_SHIPPING_CHOICES,
  canDeletePurchase,
  missingInvoiceFields,
} from "@/features/purchases/orders/domain/purchaseRules";
import { PURCHASE_PAYMENT_SIDE } from "@/features/purchases/orders/domain/purchasePayments";
import { PURCHASE_STATUSES } from "@/features/purchases/orders/services/constants";
import PurchaseSupplierSection from "../components/forms/PurchaseSupplierSection";
import PurchaseItemsSection from "../components/forms/PurchaseItemsSection";
import CancelPurchaseDialog from "../components/forms/CancelPurchaseDialog";
import DocumentKindPicker from "@/shared/components/documents/DocumentKindPicker";
import DocumentFormLayout, {
  DocumentMobileBar,
  FormSection,
  OrderSummaryCard,
} from "@/shared/components/forms/DocumentFormLayout";
import { scrollToSection } from "@/shared/lib/scrollToSection";
import OrderDetailsCard from "@/shared/components/forms/OrderDetailsCard";
import StatusChoice from "@/shared/components/forms/StatusChoice";
import SettlementCard from "@/shared/components/payments/SettlementCard";
import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";
import { paymentTypeOf } from "@/shared/components/payments/usePaymentDraft";
import { useInvoiceAttachments } from "@/shared/components/invoice/useInvoiceAttachments";
import { useReturnedNewProduct } from "@/shared/components/products/useReturnedNewProduct";
import { useDocumentFormDraft } from "@/shared/hooks/useDocumentFormDraft";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { invoiceTotals } from "@/shared/domain/invoice/lineMath";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import {
  liveRows,
  netPaidOf,
  resolvedRows,
  rowsTotal,
  settlementChanges,
  settlementProblem,
} from "@/shared/domain/payments/settlement";

/**
 * فرمِ خرید — ثبتِ تازه (`purchase` خالی) و ویرایشِ پیش‌فاکتور (تنها وضعیتی
 * که `UpdatePurchase` می‌پذیرد). خریدِ صادرشده در `PurchaseIssuedView` باز
 * می‌شود.
 *
 * ترتیبِ صفحه همان ترتیبِ کار است: نوعِ سند ← تامین‌کننده ← اقلام ← مشخصات و
 * پیوست ← پرداخت؛ کنارش خلاصه، آنچه کم است و دکمه‌ی ثبت.
 *
 *  - پیش‌فاکتور: شماره، تاریخ، سررسید و پرداخت ندارد؛ اقلام بعداً هم عوض می‌شوند.
 *  - فاکتور: شماره و تاریخِ فاکتورِ تامین‌کننده الزامی؛ «در انتظار ارسال» یا
 *    «ارسال شده»؛ پرداخت (نسیه، نقدی، انتقال، چک یا ترکیبی) همراهِ همان ثبت.
 *
 * بعد از ثبت، خودِ سند باز می‌شود؛ ذخیره‌ی پیش‌فاکتور روی همان سند می‌ماند.
 */
export default function PurchaseForm({ purchase }) {
  const isNew = !purchase;
  const navigate = useNavigate();
  const { allows } = usePermission();
  const [showErrors, setShowErrors] = useState(false);
  const [dialog, setDialog] = useState(null); // "delete" | "cancel"

  const store = usePurchaseFormStore();
  const { formData, setFormData, setItems, setSettlement, resetForm } = store;
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

  // پیش‌پرداختِ قدیمی روی پیش‌فاکتور (پیش از قفلِ پیش‌فاکتور ممکن بود).
  const prepayments = (purchase?.paymentDetails || []).filter((payment) => !payment.voidedAt);
  const prepaid = netPaidOf(prepayments, PURCHASE_PAYMENT_SIDE.direction);
  const payable = Math.max(0, totals.totalAmount - prepaid);
  const rows = isInvoice
    ? liveRows(resolvedRows(formData.settlement, payable, PaymentTypeEnum.CREDIT))
    : [];
  const paid = prepaid + rowsTotal(rows);
  const settlementError = isInvoice ? settlementProblem(rows, payable) : null;
  const invoiceErrors = missingInvoiceFields(formData, status);

  const checks = [
    { key: "party", section: "party", label: "تامین‌کننده را انتخاب کنید", done: Boolean(formData.supplierId) },
    { key: "items", section: "items", label: "دست‌کم یک کالا اضافه کنید", done: items.length > 0 },
    ...(isInvoice
      ? [{ key: "invoice", section: "details", label: "شماره و تاریخِ فاکتور را وارد کنید", done: !invoiceErrors }]
      : []),
    ...(settlementError ? [{ key: "payment", section: "payment", label: settlementError, done: false }] : []),
  ];

  const onSubmit = (e) => {
    e.preventDefault();
    const missing = checks.find((check) => !check.done);
    if (missing) {
      setShowErrors(true);
      toast.error(missing.label);
      scrollToSection(missing.section);
      return;
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
      paymentDate: isInvoice && paid < totals.totalAmount ? formData.paymentDate || null : null,
      description: formData.description || "",
      items,
      paymentType: paymentTypeOf([...prepayments, ...rows]),
      status,
      attachments: attachments.filesPayload,
    };

    if (isNew) {
      createMutation.mutate(
        { ...payload, paymentRows: rows },
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
      {
        update: payload,
        paymentDraft: settlementChanges(rows, PURCHASE_PAYMENT_SIDE.direction),
      },
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
  const deletable = !isNew && canDeletePurchase(purchase) && prepayments.length === 0;
  const cancellable = !isNew && prepayments.length > 0;

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
            <DocumentKindPicker
              value={isInvoice ? "invoice" : "proforma"}
              onChange={(kind) =>
                setFormData({
                  status: kind === "proforma" ? PURCHASE_STATUSES.PROFORMA : PURCHASE_STATUSES.PENDING,
                })
              }
              descriptions={PURCHASE_KIND_DESCRIPTIONS}
            />
            <FormSection name="party">
              <PurchaseSupplierSection
                step={1}
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
                step={2}
                items={items}
                products={products}
                isLoadingProducts={productsLoading}
                onItemsChange={setItems}
                onAddNewProduct={() => openSubPage(ROUTES.WAREHOUSE_PRODUCTS_NEW)}
              />
            </FormSection>
            <FormSection name="details">
              <OrderDetailsCard
                step={3}
                isInvoice={isInvoice}
                withNumber
                formData={formData}
                onFormChange={setFormData}
                errors={showErrors ? invoiceErrors ?? {} : {}}
                attachments={attachments}
                attachmentsLabel={isInvoice ? "تصویرِ فاکتورِ تامین‌کننده" : "تصویرِ پیش‌فاکتورِ تامین‌کننده"}
                extra={
                  <StatusChoice
                    label="وضعیتِ ارسال"
                    options={PURCHASE_SHIPPING_CHOICES}
                    value={status}
                    onChange={(next) => setFormData({ status: next })}
                  />
                }
              />
            </FormSection>
            {isInvoice && (
              <FormSection name="payment">
                <SettlementCard
                  step={4}
                  title="پرداخت به تامین‌کننده"
                  settlement={formData.settlement}
                  onSettlementChange={setSettlement}
                  payable={payable}
                  remaining={totals.totalAmount - paid}
                  fallbackMethod={PaymentTypeEnum.CREDIT}
                  creditHint="کلِ مبلغ بدهیِ ما به تامین‌کننده می‌ماند و بعداً از صفحه‌ی همین فاکتور پرداخت می‌شود."
                  dueDate={formData.paymentDate}
                  onDueDateChange={(paymentDate) => setFormData({ paymentDate })}
                  prepayments={prepayments}
                  error={showErrors ? settlementError : null}
                />
              </FormSection>
            )}
          </>
        }
        aside={
          <OrderSummaryCard
            title={isInvoice ? "فاکتور خرید" : "پیش‌فاکتور خرید"}
            itemCount={items.length}
            totals={totals}
            payment={
              isInvoice
                ? { paid, remaining: totals.totalAmount - paid, remainingLabel: "بدهی به تامین‌کننده" }
                : null
            }
            checklist={checks}
            canSubmit={canEdit}
            submitLabel={submitLabel}
            isBusy={isBusy}
            onCancel={leave}
            cancelLabel={isNew ? "انصراف" : "بستن بدونِ ذخیره"}
            footer={
              (deletable && allows("PurchaseDelete")) || (cancellable && canEdit) ? (
                <>
                  {deletable && allows("PurchaseDelete") && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDialog("delete")}
                      disabled={isBusy}
                    >
                      <Trash2 className="size-3.5" />
                      حذف پیش‌فاکتور
                    </Button>
                  )}
                  {cancellable && canEdit && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      title="پیش‌فاکتوری که پیش‌پرداخت دارد حذف نمی‌شود؛ لغو می‌شود."
                      onClick={() => setDialog("cancel")}
                      disabled={isBusy}
                    >
                      <Ban className="size-3.5" />
                      لغو خرید
                    </Button>
                  )}
                </>
              ) : null
            }
          />
        }
        mobileBar={
          canEdit && (
            <DocumentMobileBar total={totals.totalAmount} submitLabel={submitLabel} isBusy={isBusy} />
          )
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
