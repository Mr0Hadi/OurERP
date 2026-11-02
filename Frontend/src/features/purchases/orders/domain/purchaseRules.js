import { PURCHASE_STATUS_LABELS, PurchaseStatusEnum } from "@/shared/domain/enums/purchaseStatus";

// ─── قلم‌های خرید پس از ثبت ─────────────────────────────────────────────────

/** همان `PurchaseItem.StillOwedQuantity`ِ بکند: سفارش − رسیده − بسته‌شده. */
export function stillOwedOf(item) {
  const ordered = Number(item?.quantity) || 0;
  const received = Number(item?.receivedQuantity) || 0;
  const shortClosed = Number(item?.shortClosedQuantity) || 0;
  return Math.max(0, ordered - received - shortClosed);
}

/**
 * خروج از پیش‌فاکتور یعنی فاکتورِ رسمیِ تامین‌کننده رسیده، پس شماره و
 * تاریخش لازم است — قاعده‌ی `CreatePurchase`/`UpdatePurchase`. خطاها به
 * شکلِ `errors`ِ `OrderInfoCard`؛ `null` یعنی ایرادی نیست.
 */
export function missingInvoiceFields(formData, status) {
  if (Number(status) === PurchaseStatusEnum.PROFORMA) return null;
  const errors = {};
  if (!String(formData.invoiceNumber || "").trim()) {
    errors.invoiceNumber = "برای صدورِ فاکتور، شماره‌ی فاکتورِ تامین‌کننده الزامی است";
  }
  if (!formData.invoiceDate) {
    errors.invoiceDate = "برای صدورِ فاکتور، تاریخِ فاکتور الزامی است";
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * نخستین دلیلی که ثبتِ فرمِ خرید را ناممکن می‌کند: `[پیام، بخشِ فرم]` یا `null`
 * (`reportFormProblem`).
 */
export function purchaseFormProblem({ formData, items, invoiceErrors }) {
  if (!formData.supplierId) return ["تامین‌کننده را انتخاب کنید.", "party"];
  if (items.length === 0) return ["دست‌کم یک کالا اضافه کنید.", "items"];
  if (invoiceErrors) return ["برای فاکتور، شماره و تاریخِ فاکتور را وارد کنید.", "info"];
  return null;
}

/** وضعیتِ ارسالِ خریدِ صادرشده — تنها دو وضعیتِ دستی پس از صدور (و لغو). */
export const PURCHASE_SHIPPING_CHOICES = [
  {
    value: PurchaseStatusEnum.PENDING,
    label: PURCHASE_STATUS_LABELS[PurchaseStatusEnum.PENDING],
    hint: "تامین‌کننده هنوز کالا را نفرستاده است.",
  },
  {
    value: PurchaseStatusEnum.SHIPPED,
    label: PURCHASE_STATUS_LABELS[PurchaseStatusEnum.SHIPPED],
    hint: "کالا در راه است. «تحویل ناقص/کامل» را دریافتِ انبار تعیین می‌کند.",
  },
];
