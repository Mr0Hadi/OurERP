import { createDocumentFormStore } from "@/shared/store/createDocumentFormStore";
import { EMPTY_PAYMENT_DRAFT } from "@/shared/domain/payments/paymentRows";
import { unitLabelOf } from "@/shared/domain/enums/productUnit";

const EMPTY_FORM = {
  customerId: "",
  customerName: "",
  invoiceNumber: "",
  invoiceDate: "",
  paymentDate: "",
  description: "",
  status: "",
  items: [],
  // دریافت‌های ثبت‌نشده (`usePaymentDraft`).
  paymentDraft: EMPTY_PAYMENT_DRAFT,
  // قیمتِ پیش‌فرضِ اقلامِ تازه: خرده (`retailPrice`) یا همکار/عمده
  // (`wholeSalePrice`). فقط فرم است؛ به سرور نمی‌رود.
  priceMode: "retail",
};

/**
 * `id`ِ هر قلم نگه داشته می‌شود چون `UpdateSale` ردیف‌ها را با همان تشخیص
 * می‌دهد (`id: 0` یعنی ردیف تازه)؛ بدون آن هر ذخیره اقلام را از نو می‌ساخت.
 */
function formFromSale(sale) {
  return {
    customerId: sale.customerId || "",
    customerName: sale.customerName || "",
    invoiceNumber: sale.invoiceNumber || "",
    invoiceDate: sale.invoiceDate || "",
    paymentDate: sale.paymentDate || "",
    description: sale.description || "",
    status: sale.status ?? "",
    items: (sale.items || []).map((item) => ({
      id: item.id,
      productId: item.productId || "",
      productCode: item.productCode || "",
      productName: item.productName || "",
      unit: unitLabelOf(item.unit),
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      discount: item.discount || 0,
      // نرخ مالیاتی که سرور برای این قلم نگه داشته — پیش‌نمایشِ جمع با آن حساب می‌شود.
      taxPercent: item.taxPercent,
      taxCategory: item.taxCategory,
      shippedQuantity: item.shippedQuantity ?? 0,
      settledQuantity: item.settledQuantity ?? 0,
    })),
  };
}

export const useSaleFormStore = createDocumentFormStore({
  emptyForm: EMPTY_FORM,
  formFromDocument: formFromSale,
});
