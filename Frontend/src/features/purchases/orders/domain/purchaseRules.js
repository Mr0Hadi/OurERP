import { PURCHASE_STATUS_LABELS, PurchaseStatusEnum } from "@/shared/domain/enums/purchaseStatus";

/**
 * لغو (`ChangePurchaseStatus` → `CANCELLED`) از پیش‌فاکتور، «در انتظار
 * ارسال» و «ارسال‌شده»، تا وقتی هیچ کالایی دریافت نشده. لغو نهایی است و
 * پرداخت‌ها روی خرید می‌مانند.
 */
export function canCancelPurchase(purchase) {
  if (!purchase) return false;
  if (!MANUAL_PurchaseStatusEnum.includes(purchase.status)) return false;
  return (purchase.items || []).every((item) => !(item.receivedQuantity > 0));
}

/**
 * مقصدهای مجازِ `ChangePurchaseStatus` از وضعیتِ فعلی (به‌جز «لغو» که
 * دکمه و دیالوگِ خودش را دارد). خروج از پیش‌فاکتور شماره و تاریخِ
 * فاکتورِ ذخیره‌شده را لازم دارد.
 */
export function purchaseStatusTargets(purchase) {
  switch (purchase?.status) {
    case PurchaseStatusEnum.PROFORMA:
      return purchase.invoiceNumber && purchase.invoiceDate
        ? [PurchaseStatusEnum.PENDING, PurchaseStatusEnum.SHIPPED]
        : [];
    case PurchaseStatusEnum.PENDING:
      return [PurchaseStatusEnum.SHIPPED];
    case PurchaseStatusEnum.SHIPPED:
      return [PurchaseStatusEnum.PENDING];
    default:
      return [];
  }
}

/**
 * وضعیت‌هایی که مرجوعی رویشان معنا دارد (`CreatePurchaseReturn`): پیش‌فاکتور، «در
 * انتظار ارسال» و لغوشده چیزی برای ادعا ندارند.
 */
export const RETURNABLE_PURCHASE_STATUSES = [
  PurchaseStatusEnum.SHIPPED,
  PurchaseStatusEnum.PARTIALLY_RECEIVED,
  PurchaseStatusEnum.RECEIVED,
];

// ─── قلم‌های خرید پس از ثبت ─────────────────────────────────────────────────

/** همان `PurchaseItem.StillOwedQuantity`ِ بکند: سفارش − رسیده − بسته‌شده. */
export function stillOwedOf(item) {
  const ordered = Number(item?.quantity) || 0;
  const received = Number(item?.receivedQuantity) || 0;
  const shortClosed = Number(item?.shortClosedQuantity) || 0;
  return Math.max(0, ordered - received - shortClosed);
}

/**
 * بستنِ قلم (`ClosePurchaseItem`) — همان شرط‌های بکند: خرید لغو نشده،
 * چیزی از *کلِ* خرید رسیده، قلم قبلاً بسته نشده و هنوز بدهکار است.
 */
export function canClosePurchaseItem(purchase, item) {
  if (!purchase || !item) return false;
  if (purchase.status === PurchaseStatusEnum.CANCELLED) return false;
  const anythingArrived = (purchase.items || []).some(
    (line) => (Number(line.receivedQuantity) || 0) > 0,
  );
  if (!anythingArrived) return false;
  if ((Number(item.shortClosedQuantity) || 0) > 0) return false;
  return stillOwedOf(item) > 0;
}

/** بازگشاییِ قلم (`ReopenPurchaseItem`) — فقط قلمِ بسته‌شده‌ی خریدِ لغونشده. */
export function canReopenPurchaseItem(purchase, item) {
  if (!purchase || !item) return false;
  if (purchase.status === PurchaseStatusEnum.CANCELLED) return false;
  return (Number(item.shortClosedQuantity) || 0) > 0;
}

// ─── وضعیتِ دستی ────────────────────────────────────────────────────────────

/**
 * وضعیت‌هایی که واحد خرید دستی انتخاب می‌کند — مراحلِ پیش از رسیدنِ کالا،
 * و همان سه وضعیتی که `CreatePurchase`/`UpdatePurchase` می‌پذیرند.
 * «تحویل ناقص/کامل» را فقط دریافتِ انبار تعیین می‌کند (سرور بعد از هر دورِ
 * دریافت از نو حسابش می‌کند) و «لغو» دکمه و دیالوگِ خودش را دارد.
 */
export const MANUAL_PurchaseStatusEnum = [
  PurchaseStatusEnum.PROFORMA,
  PurchaseStatusEnum.PENDING,
  PurchaseStatusEnum.SHIPPED,
];

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
