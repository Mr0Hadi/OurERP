import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { usePurchaseFormStore } from "@/features/purchases/orders/store/purchaseFormStore";
import { useCreatePurchaseMutation } from "@/features/purchases/orders/services/mutations";
import { useSuppliersOptionsQuery } from "@/features/suppliers/services/queries";
import { useProductsOptionsQuery } from "@/features/warehouse/products/services/queries";
import { PURCHASE_STATUS_CHOICES } from "@/features/purchases/orders/domain/purchaseRules";

import PurchaseSupplierSection from "../components/forms/PurchaseSupplierSection";
import PurchaseItemsSection from "../components/forms/PurchaseItemsSection";
import OrderInfoSection from "@/shared/components/forms/OrderInfoSection";
import OrderPaymentSection from "@/shared/components/forms/OrderPaymentSection";
import StatusChoice from "@/shared/components/forms/StatusChoice";
import DocumentFormLayout, {
  DocumentMobileBar,
  DocumentSummaryCard,
} from "@/shared/components/forms/DocumentFormLayout";
import AttachmentsCard from "@/shared/components/invoice/AttachmentsCard";
import { useInvoiceAttachments } from "@/shared/components/invoice/useInvoiceAttachments";
import { useReturnedNewProduct } from "@/shared/components/products/useReturnedNewProduct";
import { useNewDocumentDraft } from "@/shared/hooks/useNewDocumentDraft";
import { usePageHeader } from "@/shared/hooks/usePageHeader";
import { ROUTES, routeWithId } from "@/shared/constants/routes";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { PurchaseStatusEnum } from "@/shared/domain/enums/purchaseStatus";
import { invoiceTotals } from "@/shared/domain/invoice/lineMath";

const partyName = (party) => party.companyName || `${party.firstName} ${party.lastName}`;

/**
 * ثبتِ خریدِ جدید. ترتیبِ کار: تامین‌کننده ← اقلام ← اطلاعاتِ فاکتور ←
 * ضمیمه؛ کنارش وضعیت، پرداخت (فقط وقتی پیش‌فاکتور نیست) و جمع
 * (`DocumentFormLayout`). بعد از ثبت، خودِ سند باز می‌شود.
 */
export default function PurchasesNewPage() {
  const navigate = useNavigate();
  const { setFormData, formData, resetForm, initializeForNew, setItems } =
    usePurchaseFormStore();

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
  const { suppliers, isLoading: suppliersLoading } = useSuppliersOptionsQuery();
  const { products, isLoading: productsLoading } = useProductsOptionsQuery();

  // تامین‌کننده‌ای که از داخلِ همین فرم ساخته شد (تا بکند شناسه را برگرداند —
  // بندِ ۹.۲ سندِ درخواست‌ها — این شاخه عملاً اجرا نمی‌شود).
  const newSupplierId = returned?.newSupplierId;
  useEffect(() => {
    const found = newSupplierId && suppliers.find((s) => s.id === newSupplierId);
    if (found) setFormData({ supplierId: found.id, supplierName: partyName(found) });
  }, [newSupplierId, suppliers, setFormData]);

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

  const paidAmountOf = () => {
    if (isProforma || formData.paymentType === PaymentTypeEnum.CREDIT) return 0;
    if (formData.paymentType === PaymentTypeEnum.MIXED) {
      return (formData.mixedPayments || []).reduce(
        (sum, part) => sum + (Number(part.amount) || 0),
        0,
      );
    }
    return Number(formData.paidAmount) || 0;
  };

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
    if (attachments.isUploading) {
      toast.error("تا پایان بارگذاری ضمیمه‌ها صبر کنید.");
      return;
    }

    const payload = {
      supplierId: formData.supplierId,
      supplierName: formData.supplierName,
      invoiceNumber: formData.invoiceNumber,
      invoiceDate: formData.invoiceDate,
      paymentDate: formData.paymentDate || null,
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
      paymentType: formData.paymentType ?? PaymentTypeEnum.CASH,
      // فقط برای ساختنِ `paymentDetails`؛ خودِ `paidAmount` فرستاده نمی‌شود.
      paidAmount: paidAmountOf(),
      mixedPayments:
        !isProforma && formData.paymentType === PaymentTypeEnum.MIXED
          ? formData.mixedPayments || []
          : [],
      checkNumber:
        formData.paymentType === PaymentTypeEnum.CHECK ? formData.checkNumber || null : null,
      transferRef:
        formData.paymentType === PaymentTypeEnum.TRANSFER ? formData.transferRef || null : null,
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
  const submitLabel = isProforma ? "ثبت پیش‌فاکتور" : "ثبت خرید";

  return (
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
          <OrderInfoSection formData={formData} onFormChange={setFormData} errors={{}} />
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
              options={PURCHASE_STATUS_CHOICES}
              value={status}
              onChange={(next) => setFormData({ status: next })}
            />
          </DocumentSummaryCard>
          {/* پیش‌فاکتور پرداختی ندارد؛ پیش‌پرداخت بعداً از کارتِ «پرداخت‌ها»ی خودِ سند. */}
          {!isProforma && (
            <OrderPaymentSection
              formData={formData}
              onFormChange={setFormData}
              totalAmount={totals.totalAmount}
              errors={{}}
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
