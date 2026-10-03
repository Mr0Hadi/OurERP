import { createDocumentFormStore } from "@/shared/store/createDocumentFormStore";
import { EMPTY_PAYMENT_DRAFT } from "@/shared/domain/payments/paymentRows";
import { unitLabelOf } from "@/shared/domain/enums/productUnit";

const EMPTY_FORM = {
  supplierId: "",
  supplierName: "",
  invoiceNumber: "",
  invoiceDate: "",
  paymentDate: "",
  description: "",
  status: "",
  items: [],
  // پرداخت‌های ثبت‌نشده (`usePaymentDraft`).
  paymentDraft: EMPTY_PAYMENT_DRAFT,
};

/**
 * `id` و مقدارِ رسیده/تسویه‌شده‌ی هر قلم هم نگه داشته می‌شوند: بدون آن‌ها هر
 * ذخیره‌ی فرم، ردیف‌های سرور را ناشناس می‌کرد و ستون «رسیده» خالی می‌شد.
 */
function formFromPurchase(purchase) {
  return {
    supplierId: purchase.supplierId || "",
    supplierName: purchase.supplierName || "",
    invoiceNumber: purchase.invoiceNumber || "",
    invoiceDate: purchase.invoiceDate || "",
    paymentDate: purchase.paymentDate || "",
    description: purchase.description || "",
    status: purchase.status ?? "",
    items: (purchase.items || []).map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      productCode: item.productCode,
      unit: unitLabelOf(item.unit),
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      discount: item.discount || 0,
      // نرخ مالیاتی که سرور برای این قلم نگه داشته — پیش‌نمایشِ جمع با آن حساب می‌شود.
      taxPercent: item.taxPercent,
      taxCategory: item.taxCategory,
      receivedQuantity: item.receivedQuantity ?? 0,
      settledQuantity: item.settledQuantity ?? 0,
    })),
  };
}

export const usePurchaseFormStore = createDocumentFormStore({
  emptyForm: EMPTY_FORM,
  formFromDocument: formFromPurchase,
});
