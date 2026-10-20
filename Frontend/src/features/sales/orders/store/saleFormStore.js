import { createDocumentFormStore } from "@/shared/store/createDocumentFormStore";
import { EMPTY_PAYMENT_DRAFT } from "@/shared/domain/payments/paymentRows";
import { unitLabelOf } from "@/shared/domain/enums/productUnit";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { EMPTY_PLAN_DRAFT, addMonthsIso } from "@/features/sales/installments/domain/installmentPlan";
import { todayIso } from "@/shared/lib/dateUtils";

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
  // فروشِ اقساطی (`paymentType = INSTALLMENT`) و پیش‌نویسِ قراردادش؛ قرارداد با صدورِ
  // فاکتور ثبت می‌شود (`CreateSaleInstallmentPlan`)، نه با خودِ فروش.
  installment: false,
  installmentPlan: EMPTY_PLAN_DRAFT,
};

/**
 * `id`ِ هر قلم نگه داشته می‌شود چون `UpdateSale` ردیف‌ها را با همان تشخیص
 * می‌دهد (`id: 0` یعنی ردیف تازه)؛ بدون آن هر ذخیره اقلام را از نو می‌ساخت.
 */
function formFromSale(sale) {
  const installment = sale.paymentType === PaymentTypeEnum.INSTALLMENT;
  return {
    customerId: sale.customerId || "",
    customerName: sale.customerName || "",
    invoiceNumber: sale.invoiceNumber || "",
    invoiceDate: sale.invoiceDate || "",
    paymentDate: sale.paymentDate || "",
    description: sale.description || "",
    status: sale.status ?? "",
    installment,
    // پیش‌فاکتورِ اقساطی قراردادش را هنگامِ صدور می‌گیرد؛ اولین سررسید پیش‌فرض یک ماه بعد.
    installmentPlan: installment
      ? { ...EMPTY_PLAN_DRAFT, firstDueDate: addMonthsIso(todayIso(), 1) }
      : EMPTY_PLAN_DRAFT,
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

/**
 * همان چیزی که `UpdateSale` از فرم می‌فرستد. فیلدهای نمایشی (نامِ مشتری، کد/واحدِ کالا که
 * انتخابگرها بعد از پر شدن می‌نشانند) و پیش‌نویس‌های همین صفحه (دریافت‌ها، قرارداد) حساب نمی‌شوند
 * — وگرنه فرمِ دست‌نخورده «تغییرکرده» دیده می‌شد و دریافت بسته می‌ماند.
 */
const documentPart = (form) =>
  JSON.stringify([
    String(form.customerId ?? ""),
    form.invoiceDate || "",
    form.paymentDate || "",
    form.description || "",
    Boolean(form.installment),
    (form.items || []).map((item) => [
      Number(item.id) || 0,
      Number(item.productId) || 0,
      Number(item.quantity) || 0,
      Number(item.unitPrice) || 0,
      Number(item.discount) || 0,
    ]),
  ]);

/**
 * سلکتور: خودِ پیش‌فاکتور (مشتری، اقلام، تاریخ‌ها، شیوه‌ی پرداخت، توضیح) عوض شده؟ ذخیره‌ی چنین
 * تغییری (`UpdateSale`) چرخه‌ی تأیید را به پیش‌نویس برمی‌گرداند، پس پیش از دریافت ممنوع است.
 */
export const isSaleDocumentChanged = (state) =>
  state.formData !== state.baseline && documentPart(state.formData) !== documentPart(state.baseline);
