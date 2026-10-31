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
  paymentDate: "",
  description: "",
  items: [],
  // دریافت‌های ثبت‌نشده (`usePaymentDraft`).
  paymentDraft: EMPTY_PAYMENT_DRAFT,
  // قیمتِ پیش‌فرضِ اقلامِ تازه: خرده (`retailPrice`) یا همکار/عمده
  // (`wholeSalePrice`). فقط فرم است؛ به سرور نمی‌رود.
  priceMode: "retail",
  // شیوه‌ی پرداخت و پیش‌نویسِ قرارداد اقساط، که فقط در مرحله‌ی دریافت انتخاب و ثبت می‌شوند
  // (`useProformaPayment`)؛ در store تا رفتن به صفحه‌ی فرعی و برگشتن پاک نشوند.
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
    paymentDate: sale.paymentDate || "",
    description: sale.description || "",
    installment,
    // اولین سررسیدِ قرارداد پیش‌فرض یک ماه بعد.
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

/*
 * تغییرهای فرمِ پیش‌فاکتور، به تفکیکِ اثرشان روی چرخه‌ی تأیید (جدولِ `UpdateSale` در بخش ۱۱ سند).
 * فقط فیلدهایی که با `UpdateSale` می‌روند سنجیده می‌شوند؛ فیلدهای نمایشی (نامِ مشتری، کد/واحدِ کالا
 * که انتخابگرها بعد از پر شدن می‌نشانند) و پیش‌نویس‌های همین صفحه (دریافت‌ها، قرارداد) نه.
 */
const changedBy = (pick) => (state) =>
  state.formData !== state.baseline && JSON.stringify(pick(state.formData)) !== JSON.stringify(pick(state.baseline));

/**
 * مشتری، اقلام، قیمت/تخفیف — ذخیره‌اش پیش‌فاکتور را به پیش‌نویس برمی‌گرداند. شیوه‌ی پرداخت (`installment`)
 * نیست: فقط در مرحله‌ی دریافت انتخاب می‌شود و همان‌جا ثبت (`useProformaPayment`).
 */
export const isSaleCoreChanged = changedBy((form) => [
  String(form.customerId ?? ""),
  (form.items || []).map((item) => [
    Number(item.id) || 0,
    Number(item.productId) || 0,
    Number(item.quantity) || 0,
    Number(item.unitPrice) || 0,
    Number(item.discount) || 0,
  ]),
]);

/** مهلتِ پرداخت — روی پیش‌فاکتور چرخه را برمی‌گرداند؛ بعد از صدورِ فاکتور آزاد است. */
export const isSaleDueDateChanged = changedBy((form) => form.paymentDate || "");

/** توضیح — اثری روی چرخه ندارد و هم‌زمان با دریافت ذخیره می‌شود. */
export const isSaleInfoChanged = changedBy((form) => form.description || "");
