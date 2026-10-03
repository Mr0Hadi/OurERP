import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { useSaleFormStore } from "@/features/sales/orders/store/saleFormStore";
import {
  useCreateInPersonSaleMutation,
  useCreateSaleMutation,
} from "@/features/sales/orders/services/mutations";
import { useProductsOptionsQuery } from "@/features/warehouse/products/services/queries";
import {
  SALE_STAGE_CHOICES,
  missingSaleInvoiceFields,
} from "@/features/sales/orders/domain/saleRules";
import { SALE_PAYMENT_SIDE } from "@/features/sales/orders/domain/salePayments";
import SaleCustomerSection from "@/features/sales/orders/components/forms/SaleCustomerSection";
import SaleItemsSection from "@/features/sales/orders/components/forms/SaleItemsSection";
import OrderInfoSection from "@/shared/components/forms/OrderInfoSection";
import StatusChoice from "@/shared/components/forms/StatusChoice";
import Notice from "@/shared/components/feedback/Notice";
import DocumentFormLayout, {
  DocumentMobileBar,
  DocumentSummaryCard,
} from "@/shared/components/forms/DocumentFormLayout";
import DocumentPaymentsEditor from "@/shared/components/payments/DocumentPaymentsEditor";
import {
  paymentTypeOf,
  usePaymentDraft,
} from "@/shared/components/payments/usePaymentDraft";
import AttachmentsCard from "@/shared/components/invoice/AttachmentsCard";
import { useInvoiceAttachments } from "@/shared/components/invoice/useInvoiceAttachments";
import { useReturnedNewProduct } from "@/shared/components/products/useReturnedNewProduct";
import { useNewDocumentDraft } from "@/shared/hooks/useNewDocumentDraft";
import { usePageHeader } from "@/shared/hooks/usePageHeader";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { SaleStatusEnum } from "@/shared/domain/enums/saleStatus";
import { invoiceTotals } from "@/shared/domain/invoice/lineMath";
import { formatRial } from "@/shared/lib/numberFormat";

/**
 * ثبتِ فروشِ جدید. ترتیبِ کار: مشتری ← اقلام ← اطلاعاتِ فاکتور ← ضمیمه؛
 * کنارش نوعِ سند، پرداخت‌ها و جمع (`DocumentFormLayout`).
 *
 *  - پیش‌فاکتور: تاریخ، سررسید و پرداخت ندارد.
 *  - فاکتور: تاریخ الزامی؛ شماره را بکند می‌سازد. بکند فروش را فقط با اولین
 *    دریافت فاکتور می‌کند، پس فاکتور بی‌دریافت ثبت نمی‌شود (فاکتورِ نسیه —
 *    بندِ ۹.۱۱ سندِ درخواست‌ها).
 *
 * اسکنِ دانه در اقلام یعنی کالا همین‌جا دستِ مشتری است: «فروشِ حضوری» —
 * ثبت، خروجِ کالا با همان کدها و «تحویل کامل» در یک درخواست.
 */
export default function SaleNewPage() {
  const navigate = useNavigate();
  const {
    formData,
    setFormData,
    resetForm,
    initializeForNew,
    setItems,
    setPaymentDraft,
  } = useSaleFormStore();

  // پیش‌نویس فقط وقتی می‌ماند که از «کالا/مشتریِ جدید» برگشته باشیم.
  const { openSubPage, returned } = useNewDocumentDraft({
    reset: resetForm,
    initialize: initializeForNew,
  });

  usePageHeader({ title: "ثبت فروش جدید", showBack: true });

  /**
   * ضمیمه‌ی پیش‌فاکتور/فاکتورِ صادرشده برای مشتری. `CreateSale` آرایه‌ی
   * `attachments` را می‌پذیرد، پس همان لحظه‌ی ثبت هم می‌شود فایل را پیوست کرد.
   */
  const attachments = useInvoiceAttachments();
  const [showErrors, setShowErrors] = useState(false);

  const createMutation = useCreateSaleMutation();
  const inPersonMutation = useCreateInPersonSaleMutation();

  const { products, isLoading: productsLoading } = useProductsOptionsQuery();
  const isTracked = (productId) =>
    Boolean(products.find((product) => product.id === productId)?.requiresUnitTracking);

  const payments = usePaymentDraft([], SALE_PAYMENT_SIDE.direction, [
    formData.paymentDraft,
    setPaymentDraft,
  ]);

  // مشتری‌ای که از داخلِ همین فرم ساخته شد (تا بکند شناسه را برگرداند —
  // بندِ ۹.۲ سندِ درخواست‌ها — این شاخه عملاً اجرا نمی‌شود).
  const newCustomerId = returned?.newCustomerId;
  useEffect(() => {
    // نام را بخشِ انتخابگر از جزئیاتِ سرور می‌خواند.
    if (newCustomerId) setFormData({ customerId: newCustomerId, customerName: "" });
  }, [newCustomerId, setFormData]);

  useReturnedNewProduct({
    productId: returned?.newProductId,
    getItems: () => useSaleFormStore.getState().formData.items || [],
    setItems,
    priceOf: (product) => product.retailPrice ?? 0,
  });

  const items = formData.items || [];
  // پیش‌نمایش با قاعده‌ی سرور (تخفیف و مالیات گرد، هر قلم جدا). جمع
  // فرستاده نمی‌شود؛ سرور خودش از اقلام و مالیاتِ کالاها حساب می‌کند.
  const totals = invoiceTotals(items);

  /**
   * دانه‌هایی که در «اقلام فروش» اسکن شده‌اند. اسکنِ دانه یعنی کالا همین‌جا
   * دستِ مشتری است: فروش ثبت، خروجِ کالا با همین کدها ثبت و «تحویل کامل» می‌شود.
   */
  const scannedBarcodes = Object.fromEntries(
    items
      .filter((item) => item.productUnitBarcodes?.length)
      .map((item) => [item.productId, item.productUnitBarcodes]),
  );
  const isInPerson = Object.keys(scannedBarcodes).length > 0;

  /**
   * `status` روی سیم نمی‌رود: فروش همیشه پیش‌فاکتور ثبت می‌شود و اولین
   * ریالِ پرداخت فاکتور را صادر می‌کند. اینجا فقط شکلِ فرم را تعیین می‌کند.
   */
  const isProforma =
    !isInPerson && Number(formData.status || SaleStatusEnum.PROFORMA) === SaleStatusEnum.PROFORMA;
  const invoiceErrors = missingSaleInvoiceFields(formData, !isProforma);
  const paid = payments.netPaid;

  /** نخستین دلیلی که ثبتِ فاکتور را ناممکن می‌کند. */
  const invoiceBlocker = () => {
    if (isInPerson) {
      if (paid < totals.totalAmount) return "در تحویل حضوری پرداخت باید کامل باشد.";
      for (const item of items) {
        const quantity = Number(item.quantity) || 0;
        const scanned = (scannedBarcodes[item.productId] || []).length;
        if (isTracked(item.productId) && scanned !== quantity) {
          return `«${item.productName}» ردیابی‌پذیر است؛ در تحویل حضوری همه‌ی ${quantity.toLocaleString("fa-IR")} دانه را اسکن کنید.`;
        }
        if (scanned > 0 && scanned !== quantity) {
          return `${scanned.toLocaleString("fa-IR")} از ${quantity.toLocaleString("fa-IR")} دانه‌ی «${item.productName}» اسکن شده؛ یا همه را اسکن کنید یا تعداد را اصلاح کنید.`;
        }
      }
      return null;
    }
    if (!isProforma && paid <= 0) {
      return "فاکتورِ فروش با اولین دریافت صادر می‌شود؛ مبلغِ دریافتی را وارد کنید یا پیش‌فاکتور ثبت کنید.";
    }
    return null;
  };

  const onSubmit = (e) => {
    e.preventDefault();

    if (!formData.customerId) {
      setShowErrors(true);
      toast.error("مشتری را انتخاب کنید.");
      return;
    }
    if (items.length === 0) {
      toast.error("دست‌کم یک قلم اضافه کنید.");
      return;
    }
    if (invoiceErrors) {
      setShowErrors(true);
      toast.error("برای فاکتور، تاریخ را وارد کنید.");
      return;
    }
    const blocker = invoiceBlocker();
    if (blocker) {
      toast.error(blocker);
      return;
    }
    if (attachments.isUploading) {
      toast.error("تا پایان بارگذاری ضمیمه‌ها صبر کنید.");
      return;
    }

    const paymentRows = isProforma ? [] : payments.rows;
    const payload = {
      customerId: formData.customerId,
      customerName: formData.customerName,
      invoiceDate: isProforma ? null : formData.invoiceDate,
      paymentDate: isProforma ? null : formData.paymentDate || null,
      description: formData.description || "",
      items: items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        productCode: item.productCode,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
      })),
      paymentType: paymentTypeOf(paymentRows),
      paymentRows,
      attachments: attachments.filesPayload,
    };

    const onSuccess = (created) => {
      attachments.commit();
      resetForm();
      navigate(
        created?.id ? routeWithId(ROUTES.SALES_DETAIL, created.id) : ROUTES.SALES,
        { replace: true },
      );
    };

    if (isInPerson) {
      inPersonMutation.mutate({ payload, scannedBarcodes }, { onSuccess });
      return;
    }
    createMutation.mutate(payload, { onSuccess });
  };

  const handleCancel = () => {
    // فایل‌های آپلودشده‌ی این نشست هیچ سندی ندارند که به آن بچسبند.
    attachments.discard();
    resetForm();
    navigate(ROUTES.SALES);
  };

  const isBusy =
    createMutation.isPending || inPersonMutation.isPending || attachments.isUploading;
  const submitLabel = isInPerson
    ? "ثبت و تحویل حضوری"
    : isProforma
      ? "ثبت پیش‌فاکتور"
      : "ثبت فاکتور";

  return (
    <DocumentFormLayout
      onSubmit={onSubmit}
      main={
        <>
          <SaleCustomerSection
            selectedId={formData.customerId}
            selectedName={formData.customerName}
            onSelect={(id, name) => {
              setFormData({ customerId: id, customerName: name });
              setShowErrors(false);
            }}
            onClear={() => setFormData({ customerId: "", customerName: "" })}
            onAddNew={() => openSubPage(ROUTES.CUSTOMERS_NEW)}
            error={showErrors && !formData.customerId ? "انتخاب مشتری الزامی است" : null}
          />
          <SaleItemsSection
            items={items}
            onItemsChange={setItems}
            products={products}
            isLoadingProducts={productsLoading}
            priceMode={formData.priceMode}
            onPriceModeChange={(priceMode) => setFormData({ priceMode })}
            onAddNewProduct={() => openSubPage(ROUTES.WAREHOUSE_PRODUCTS_NEW)}
          />
          <OrderInfoSection
            formData={formData}
            onFormChange={setFormData}
            proforma={isProforma}
            invoiceNumberDisabled
            errors={showErrors ? invoiceErrors ?? {} : {}}
          />
          <AttachmentsCard
            label="پیش‌فاکتور/فاکتورِ صادرشده برای مشتری"
            attachments={attachments}
          />
        </>
      }
      aside={
        <>
          <DocumentSummaryCard
            itemCount={items.length}
            totals={totals}
            submitLabel={submitLabel}
            isBusy={isBusy}
            onCancel={handleCancel}
          >
            {isInPerson ? (
              <Notice tone="info">
                دانه اسکن شده، پس تحویل حضوری است: پرداخت باید کامل باشد و فروش
                بعد از ثبت «تحویل کامل» می‌شود.
              </Notice>
            ) : (
              <StatusChoice
                label="نوعِ سند"
                options={SALE_STAGE_CHOICES}
                value={isProforma ? "proforma" : "invoice"}
                onChange={(stage) =>
                  setFormData({
                    status:
                      stage === "proforma" ? SaleStatusEnum.PROFORMA : SaleStatusEnum.PROCESSING,
                  })
                }
              />
            )}
          </DocumentSummaryCard>

          {!isProforma && (
            <DocumentPaymentsEditor
              draft={payments}
              side={SALE_PAYMENT_SIDE}
              totalAmount={totals.totalAmount}
              dueDate={formData.paymentDate}
              onDueDateChange={(paymentDate) => setFormData({ paymentDate })}
              allowRefund={false}
              notice={
                isInPerson
                  ? `در تحویل حضوری کلِ ${formatRial(totals.totalAmount)} باید دریافت شود.`
                  : "فاکتور با اولین دریافت صادر می‌شود؛ باقی‌مانده بدهیِ مشتری است."
              }
            />
          )}
        </>
      }
      mobileBar={
        <DocumentMobileBar
          total={totals.totalAmount}
          submitLabel={submitLabel}
          isBusy={isBusy}
        />
      }
    />
  );
}
