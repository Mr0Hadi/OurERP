import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { usePurchaseFormStore } from "@/features/purchases/orders/store/purchaseFormStore";
import { useCreatePurchaseMutation } from "@/features/purchases/orders/services/mutations";
import { useProductsOptionsQuery } from "@/features/warehouse/products/services/queries";
import {
  PURCHASE_SHIPPING_CHOICES,
  PURCHASE_STAGE_CHOICES,
  missingInvoiceFields,
} from "@/features/purchases/orders/domain/purchaseRules";
import { PURCHASE_PAYMENT_SIDE } from "@/features/purchases/orders/domain/purchasePayments";

import PurchaseSupplierSection from "../components/forms/PurchaseSupplierSection";
import PurchaseItemsSection from "../components/forms/PurchaseItemsSection";
import OrderInfoSection from "@/shared/components/forms/OrderInfoSection";
import StatusChoice from "@/shared/components/forms/StatusChoice";
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
import { PurchaseStatusEnum } from "@/shared/domain/enums/purchaseStatus";
import { invoiceTotals } from "@/shared/domain/invoice/lineMath";

/**
 * ثبتِ خریدِ جدید. ترتیبِ کار: تامین‌کننده ← اقلام ← اطلاعاتِ فاکتور ←
 * ضمیمه؛ کنارش نوعِ سند، پرداخت‌ها و جمع (`DocumentFormLayout`).
 *
 *  - پیش‌فاکتور: شماره، تاریخ، سررسید و پرداخت ندارد.
 *  - فاکتور: شماره و تاریخِ فاکتورِ تامین‌کننده الزامی؛ «در انتظار ارسال» یا
 *    «ارسال شده»؛ پرداخت‌ها (اختیاری) همراهِ همان ثبت.
 *
 * بعد از ثبت، خودِ سند باز می‌شود.
 */
export default function PurchasesNewPage() {
  const navigate = useNavigate();
  const {
    setFormData,
    formData,
    resetForm,
    initializeForNew,
    setItems,
    setPaymentDraft,
  } = usePurchaseFormStore();

  // پیش‌نویس فقط وقتی می‌ماند که از «کالا/تامین‌کننده‌ی جدید» برگشته باشیم.
  const { openSubPage, returned } = useNewDocumentDraft({
    reset: resetForm,
    initialize: initializeForNew,
  });

  usePageHeader({ title: "ثبت خرید جدید", showBack: true });

  /**
   * ضمیمه‌ی پیش‌فاکتور/فاکتورِ تامین‌کننده. `CreatePurchase` آرایه‌ی
   * `attachments` را می‌پذیرد، پس همان لحظه‌ی ثبت هم می‌شود فایل را پیوست کرد.
   */
  const attachments = useInvoiceAttachments();
  const [showErrors, setShowErrors] = useState(false);

  const createMutation = useCreatePurchaseMutation();
  const { products, isLoading: productsLoading } = useProductsOptionsQuery();

  const payments = usePaymentDraft([], PURCHASE_PAYMENT_SIDE.direction, [
    formData.paymentDraft,
    setPaymentDraft,
  ]);

  // تامین‌کننده‌ای که از داخلِ همین فرم ساخته شد (تا بکند شناسه را برگرداند —
  // بندِ ۹.۲ سندِ درخواست‌ها — این شاخه عملاً اجرا نمی‌شود).
  const newSupplierId = returned?.newSupplierId;
  useEffect(() => {
    // نام را بخشِ انتخابگر از جزئیاتِ سرور می‌خواند.
    if (newSupplierId) setFormData({ supplierId: newSupplierId, supplierName: "" });
  }, [newSupplierId, setFormData]);

  useReturnedNewProduct({
    productId: returned?.newProductId,
    getItems: () => usePurchaseFormStore.getState().formData.items || [],
    setItems,
    priceOf: (product) => product.purchasePrice ?? 0,
  });

  const items = formData.items || [];
  // پیش‌نمایش با قاعده‌ی سرور (تخفیف و مالیات گرد، هر قلم جدا). جمع
  // فرستاده نمی‌شود؛ سرور خودش از اقلام و مالیاتِ کالاها حساب می‌کند.
  const totals = invoiceTotals(items);

  const status =
    formData.status === "" || formData.status == null
      ? PurchaseStatusEnum.PROFORMA
      : Number(formData.status);
  const isProforma = status === PurchaseStatusEnum.PROFORMA;
  const invoiceErrors = missingInvoiceFields(formData, status);

  const setStage = (stage) =>
    setFormData({
      status: stage === "proforma" ? PurchaseStatusEnum.PROFORMA : PurchaseStatusEnum.PENDING,
    });

  const onSubmit = (e) => {
    e.preventDefault();

    if (!formData.supplierId) {
      setShowErrors(true);
      toast.error("تامین‌کننده را انتخاب کنید.");
      return;
    }
    if (items.length === 0) {
      toast.error("دست‌کم یک قلم اضافه کنید.");
      return;
    }
    if (invoiceErrors) {
      setShowErrors(true);
      toast.error("برای فاکتور، شماره و تاریخِ فاکتورِ تامین‌کننده را وارد کنید.");
      return;
    }
    if (attachments.isUploading) {
      toast.error("تا پایان بارگذاری ضمیمه‌ها صبر کنید.");
      return;
    }

    const paymentRows = isProforma ? [] : payments.rows;
    const payload = {
      supplierId: formData.supplierId,
      supplierName: formData.supplierName,
      // پیش‌فاکتور شماره، تاریخ و سررسید ندارد.
      invoiceNumber: isProforma ? "" : formData.invoiceNumber,
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
      status,
      attachments: attachments.filesPayload,
    };

    createMutation.mutate(payload, {
      onSuccess: (created) => {
        attachments.commit();
        resetForm();
        navigate(
          created?.id ? routeWithId(ROUTES.PURCHASES_DETAIL, created.id) : ROUTES.PURCHASES,
          { replace: true },
        );
      },
    });
  };

  const handleCancel = () => {
    // فایل‌های آپلودشده‌ی این نشست هیچ سندی ندارند که به آن بچسبند.
    attachments.discard();
    resetForm();
    navigate(ROUTES.PURCHASES);
  };

  const isBusy = createMutation.isPending || attachments.isUploading;
  const submitLabel = isProforma ? "ثبت پیش‌فاکتور" : "ثبت فاکتور";

  return (
    <DocumentFormLayout
      onSubmit={onSubmit}
      main={
        <>
          <PurchaseSupplierSection
            selectedId={formData.supplierId}
            selectedName={formData.supplierName}
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
            proforma={isProforma}
            errors={showErrors ? invoiceErrors ?? {} : {}}
          />
          <AttachmentsCard
            label="پیش‌فاکتور/فاکتورِ دریافتی از تامین‌کننده"
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
            <StatusChoice
              label="نوعِ سند"
              options={PURCHASE_STAGE_CHOICES}
              value={isProforma ? "proforma" : "invoice"}
              onChange={setStage}
            />
            {!isProforma && (
              <StatusChoice
                label="وضعیتِ ارسال"
                options={PURCHASE_SHIPPING_CHOICES}
                value={status}
                onChange={(next) => setFormData({ status: next })}
              />
            )}
          </DocumentSummaryCard>

          {!isProforma && (
            <DocumentPaymentsEditor
              draft={payments}
              side={PURCHASE_PAYMENT_SIDE}
              totalAmount={totals.totalAmount}
              dueDate={formData.paymentDate}
              onDueDateChange={(paymentDate) => setFormData({ paymentDate })}
              allowRefund={false}
              notice="بدونِ پرداخت یعنی نسیه."
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
