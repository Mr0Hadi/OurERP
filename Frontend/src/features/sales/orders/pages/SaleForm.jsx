import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { useSaleFormStore } from "@/features/sales/orders/store/saleFormStore";
import {
  useCreateInPersonSaleMutation,
  useCreateSaleMutation,
  useRemoveSaleMutation,
  useSaleChangesSaver,
} from "@/features/sales/orders/services/mutations";
import { useProductsOptionsQuery } from "@/features/warehouse/products/services/queries";
import { missingSaleInvoiceFields } from "@/features/sales/orders/domain/saleRules";
import { SALE_PAYMENT_SIDE } from "@/features/sales/orders/domain/salePayments";
import SaleCustomerSection from "../components/forms/SaleCustomerSection";
import SaleItemsSection from "../components/forms/SaleItemsSection";
import DocumentFormLayout, {
  DocumentMobileBar,
  FormSection,
  OrderSummaryCard,
} from "@/shared/components/forms/DocumentFormLayout";
import OrderInfoCard from "@/shared/components/forms/OrderInfoCard";
import PaymentsCard from "@/shared/components/payments/PaymentsCard";
import InvoiceDocumentSection from "@/shared/components/invoice/InvoiceDocumentSection";
import ConfirmDialog from "@/shared/components/feedback/ConfirmDialog";
import StatusBadge from "@/shared/components/status/StatusBadge";
import { paymentTypeOf, usePaymentDraft } from "@/shared/components/payments/usePaymentDraft";
import { useInvoiceAttachments } from "@/shared/components/invoice/useInvoiceAttachments";
import { useReturnedNewProduct } from "@/shared/components/products/useReturnedNewProduct";
import { useDocumentFormDraft } from "@/shared/hooks/useDocumentFormDraft";
import { usePermission } from "@/features/auth/hooks/usePermission";
import { scrollToSection } from "@/shared/lib/scrollToSection";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { SaleStatusEnum } from "@/shared/domain/enums/saleStatus";
import { invoiceTotals } from "@/shared/domain/invoice/lineMath";
import { formatNumber, formatRial } from "@/shared/lib/numberFormat";

/**
 * دانه‌هایی که در اقلام اسکن شده‌اند (`{ [productId]: string[] }`). اسکنِ دانه
 * یعنی کالا همین‌جا دستِ مشتری است: «فروشِ حضوری».
 */
function scannedBarcodesOf(items) {
  return Object.fromEntries(
    items
      .filter((item) => item.productUnitBarcodes?.length)
      .map((item) => [item.productId, item.productUnitBarcodes]),
  );
}

/** قلم‌هایی که در فروشِ حضوری اسکنشان کامل نیست (پیامِ اولی). */
function inPersonScanProblem(items, scanned, isTracked) {
  for (const item of items) {
    const quantity = Number(item.quantity) || 0;
    const count = (scanned[item.productId] || []).length;
    if (isTracked(item.productId) && count !== quantity) {
      return `«${item.productName}» ردیابی‌پذیر است؛ همه‌ی ${formatNumber(quantity)} دانه را اسکن کنید`;
    }
    if (count > 0 && count !== quantity) {
      return `${formatNumber(count)} از ${formatNumber(quantity)} دانه‌ی «${item.productName}» اسکن شده؛ همه را اسکن یا تعداد را اصلاح کنید`;
    }
  }
  return null;
}

/**
 * فرمِ فروش — ثبتِ تازه (`sale` خالی) و ویرایشِ پیش‌فاکتور (تنها وضعیتی که
 * `UpdateSale` می‌پذیرد). فروشِ صادرشده در `SaleIssuedView` باز می‌شود.
 *
 * چیدمان همان نمای فاکتورِ صادرشده است: مشتری ← اقلام ← دریافت‌ها در ستونِ اصلی؛
 * جمع و دکمه‌ی ثبت ← اطلاعاتِ فاکتور ← سند و پیوست در ستونِ کناری.
 *
 *  - پیش‌فاکتور: تاریخ، سررسید و دریافت ندارد.
 *  - فاکتور: تاریخ الزامی؛ شماره را بکند می‌سازد. بکند فروش را فقط با اولین
 *    دریافت فاکتور می‌کند، پس «نسیه»ی کامل فعلاً بسته است (بندِ ۹.۱۱).
 *  - اسکنِ دانه در اقلام یعنی «فروشِ حضوری»: ثبت، خروجِ کالا با همان کدها و
 *    «تحویل کامل» در یک درخواست؛ دریافت باید کامل باشد.
 */
export default function SaleForm({ sale }) {
  const isNew = !sale;
  const navigate = useNavigate();
  const { allows } = usePermission();
  const [showErrors, setShowErrors] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const store = useSaleFormStore();
  const { formData, setFormData, setItems, setPaymentDraft, resetForm } = store;
  const { openSubPage, returned, ready } = useDocumentFormDraft({
    doc: sale,
    initializedForId: store.initializedForId,
    reset: resetForm,
    initializeNew: store.initializeForNew,
    initializeFrom: store.initializeFromSale,
  });

  /** ضمیمه‌ها؛ `UpdateSale` آرایه را *جایگزین* می‌کند، پس همیشه فهرستِ نهایی. */
  const attachments = useInvoiceAttachments(sale?.attachments || []);
  const attachmentsReset = attachments.reset;
  useEffect(() => {
    if (sale) attachmentsReset(sale.attachments || []);
    // با همان کلیدِ فرم تازه می‌شود.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sale?.id, sale?.updatedAt, attachmentsReset]);

  // دریافت‌ها تا دکمه‌ی ثبت در پیش‌نویس (store) می‌مانند؛ اولینش فاکتور را صادر می‌کند.
  const payments = usePaymentDraft(sale?.paymentDetails || [], SALE_PAYMENT_SIDE.direction, [
    formData.paymentDraft,
    setPaymentDraft,
  ]);

  const createMutation = useCreateSaleMutation();
  const inPersonMutation = useCreateInPersonSaleMutation();
  const saver = useSaleChangesSaver(sale?.id);
  const deleteMutation = useRemoveSaleMutation();
  const { products, isLoading: productsLoading } = useProductsOptionsQuery();

  // مشتری‌ای که از داخلِ همین فرم ساخته شد (تا بکند شناسه را برگرداند —
  // بندِ ۹.۲ — عملاً اجرا نمی‌شود). نام را انتخابگر از سرور می‌خواند.
  const newCustomerId = returned?.newCustomerId;
  useEffect(() => {
    if (newCustomerId) setFormData({ customerId: newCustomerId, customerName: "" });
  }, [newCustomerId, setFormData]);

  useReturnedNewProduct({
    productId: returned?.newProductId,
    getItems: () => useSaleFormStore.getState().formData.items || [],
    setItems,
    priceOf: (product) => product.retailPrice ?? 0,
  });

  if (!ready) return null;

  const items = formData.items || [];
  // پیش‌نمایش با قاعده‌ی سرور؛ جمع فرستاده نمی‌شود.
  const totals = invoiceTotals(items);

  const scannedBarcodes = scannedBarcodesOf(items);
  const isInPerson = isNew && Object.keys(scannedBarcodes).length > 0;
  const isTracked = (productId) =>
    Boolean(products.find((product) => product.id === productId)?.requiresUnitTracking);

  // `status` روی سیم نمی‌رود؛ فقط شکلِ فرم را تعیین می‌کند.
  const isInvoice =
    isInPerson || Number(formData.status || SaleStatusEnum.PROFORMA) !== SaleStatusEnum.PROFORMA;
  const invoiceErrors = missingSaleInvoiceFields(formData, isInvoice);
  const paid = payments.netPaid;

  /** نخستین دلیلی که ثبت را ناممکن می‌کند: `[پیام، بخش]`. */
  const blocker = () => {
    if (!formData.customerId) return ["مشتری را انتخاب کنید.", "party"];
    if (items.length === 0) return ["دست‌کم یک کالا اضافه کنید.", "items"];
    if (invoiceErrors) return ["برای فاکتور، تاریخ را وارد کنید.", "info"];
    if (isInPerson) {
      const scanProblem = inPersonScanProblem(items, scannedBarcodes, isTracked);
      if (scanProblem) return [scanProblem, "items"];
      if (paid < totals.totalAmount) {
        return [`در تحویلِ حضوری کلِ ${formatRial(totals.totalAmount)} باید دریافت شود.`, "payment"];
      }
    }
    if (isInvoice && paid <= 0) {
      return ["فاکتورِ فروش با اولین دریافت صادر می‌شود؛ دریافت را ثبت کنید یا پیش‌فاکتور ثبت کنید.", "payment"];
    }
    return null;
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const problem = blocker();
    if (problem) {
      setShowErrors(true);
      toast.error(problem[0]);
      return scrollToSection(problem[1]);
    }
    if (attachments.isUploading) {
      toast.error("تا پایان بارگذاری پیوست‌ها صبر کنید.");
      return;
    }

    const payload = {
      customerId: formData.customerId,
      customerName: formData.customerName,
      invoiceDate: isInvoice ? formData.invoiceDate : null,
      paymentDate: isInvoice ? formData.paymentDate || null : null,
      description: formData.description || "",
      items,
      paymentType: paymentTypeOf(isInvoice ? payments.rows : []),
      attachments: attachments.filesPayload,
    };

    if (!isNew) {
      // اول خودِ پیش‌فاکتور، بعد دریافت‌ها — اولینش فاکتور را صادر می‌کند و
      // صفحه خودش به نمای فاکتورِ صادرشده می‌رود.
      saver.mutate(
        { update: payload, paymentDraft: isInvoice ? payments : null },
        {
          onSuccess: (latest) => {
            attachments.commit();
            resetForm();
            if (latest) store.initializeFromSale(latest);
          },
        },
      );
      return;
    }

    const onSuccess = (created) => {
      attachments.commit();
      resetForm();
      navigate(created?.id ? routeWithId(ROUTES.SALES_DETAIL, created.id) : ROUTES.SALES, {
        replace: true,
      });
    };
    const body = { ...payload, paymentRows: payments.rows };
    if (isInPerson) inPersonMutation.mutate({ payload: body, scannedBarcodes }, { onSuccess });
    else createMutation.mutate(body, { onSuccess });
  };

  const leave = () => {
    attachments.discard();
    resetForm();
    navigate(ROUTES.SALES);
  };

  const canEdit = isNew || allows("SaleUpdate");
  const isBusy =
    createMutation.isPending ||
    inPersonMutation.isPending ||
    saver.isPending ||
    deleteMutation.isPending ||
    attachments.isUploading;
  const submitLabel = isInPerson
    ? "ثبت و تحویل حضوری"
    : isNew
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
              <SaleCustomerSection
                selectedId={formData.customerId}
                selectedName={formData.customerName}
                onSelect={(id, name) => setFormData({ customerId: id, customerName: name })}
                onClear={() => setFormData({ customerId: "", customerName: "" })}
                onAddNew={() => openSubPage(ROUTES.CUSTOMERS_NEW)}
                error={showErrors && !formData.customerId ? "مشتری را انتخاب کنید" : null}
              />
            </FormSection>
            <FormSection name="items">
              <SaleItemsSection
                items={items}
                onItemsChange={setItems}
                products={products}
                isLoadingProducts={productsLoading}
                priceMode={formData.priceMode}
                onPriceModeChange={(priceMode) => setFormData({ priceMode })}
                onAddNewProduct={() => openSubPage(ROUTES.WAREHOUSE_PRODUCTS_NEW)}
              />
            </FormSection>
            {isInvoice && (
              <FormSection name="payment">
                <PaymentsCard
                  title="دریافت‌ها"
                  draft={payments}
                  side={SALE_PAYMENT_SIDE}
                  total={totals.totalAmount}
                  canManage={isNew || allows("SalePayment")}
                  allowRefund={false}
                  notice={
                    isInPerson
                      ? "تحویلِ حضوری: کلِ مبلغ باید دریافت شود."
                      : "فاکتورِ فروش با اولین دریافت صادر می‌شود؛ مانده بدهیِ مشتری است."
                  }
                />
              </FormSection>
            )}
          </>
        }
        aside={
          <>
            <OrderSummaryCard
              title={isInvoice ? "فاکتور فروش" : "پیش‌فاکتور فروش"}
              badge={isInPerson && <StatusBadge tone="info">تحویل حضوری</StatusBadge>}
              itemCount={items.length}
              totals={totals}
              canSubmit={canEdit}
              submitLabel={submitLabel}
              isBusy={isBusy}
              onCancel={leave}
              footer={
                !isNew &&
                allows("SaleDelete") && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setConfirmDelete(true)}
                    disabled={isBusy}
                  >
                    <Trash2 className="size-3.5" />
                    حذف پیش‌فاکتور
                  </Button>
                )
              }
            />
            <FormSection name="info">
              <OrderInfoCard
                kind={isInvoice ? "invoice" : "proforma"}
                onKindChange={(kind) =>
                  setFormData({
                    status: kind === "proforma" ? SaleStatusEnum.PROFORMA : SaleStatusEnum.PROCESSING,
                  })
                }
                kindNote={isInPerson ? "دانه اسکن شده؛ فروش حضوری است و فاکتور همین حالا تحویل می‌شود." : undefined}
                formData={formData}
                onFormChange={setFormData}
                errors={showErrors ? invoiceErrors ?? {} : {}}
              />
            </FormSection>
            <InvoiceDocumentSection
              title={isInvoice ? "فاکتور" : "پیش‌فاکتور"}
              invoiceNumber={formData.invoiceNumber}
              attachments={attachments}
              documentKind={isNew ? undefined : "sale"}
              documentId={sale?.id}
              attachmentLabel="تصویر یا PDFِ برگه"
            />
          </>
        }
        mobileBar={
          canEdit && (
            <DocumentMobileBar total={totals.totalAmount} submitLabel={submitLabel} isBusy={isBusy} />
          )
        }
      />

      {!isNew && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="حذف پیش‌فاکتور فروش"
          description="سندِ حذف‌شده دیگر در فهرست فروش‌ها دیده نمی‌شود."
          confirmLabel="حذف"
          pendingLabel="در حال حذف..."
          isPending={deleteMutation.isPending}
          onConfirm={() =>
            deleteMutation.mutate(sale.id, {
              onSuccess: () => {
                resetForm();
                navigate(ROUTES.SALES);
              },
            })
          }
        />
      )}
    </>
  );
}
