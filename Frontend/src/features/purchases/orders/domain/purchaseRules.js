import { PURCHASE_STATUSES } from "../services/constants";

/**
 * حذف فقط برای پیش‌فاکتور است (`DeletePurchase`)؛ خریدِ صادرشده لغو
 * می‌شود، نه حذف. پیش‌فاکتوری که پیش‌پرداختِ باطل‌نشده دارد را سرور رد
 * می‌کند تا پرداخت‌ها اول ابطال شوند.
 */
export function canDeletePurchase(purchase) {
  if (!purchase) return false;
  return purchase.status === PURCHASE_STATUSES.PROFORMA;
}

/** پیش‌پرداختِ باطل‌نشده‌ای که جلوی حذفِ پیش‌فاکتور را می‌گیرد. */
export function hasLivePayments(doc) {
  return (doc?.paymentDetails || []).some((payment) => !payment.voidedAt);
}

/**
 * لغو (`ChangePurchaseStatus` → `CANCELLED`) از پیش‌فاکتور، «در انتظار
 * ارسال» و «ارسال‌شده»، تا وقتی هیچ کالایی دریافت نشده. لغو نهایی است و
 * پرداخت‌ها روی خرید می‌مانند.
 */
export function canCancelPurchase(purchase) {
  if (!purchase) return false;
  if (!MANUAL_PURCHASE_STATUSES.includes(purchase.status)) return false;
  return (purchase.items || []).every((item) => !(item.receivedQuantity > 0));
}

/** برای نمایش پیام راهنما وقتی نه حذف و نه لغو ممکن است. */
export function getPurchaseLockReason(purchase) {
  if (!purchase) return null;
  if (canDeletePurchase(purchase) || canCancelPurchase(purchase)) return null;
  if (purchase.status === PURCHASE_STATUSES.CANCELLED) return null;
  return "کالای این خرید در انبار دریافت شده و دیگر قابل لغو نیست؛ برای اصلاح از مسیر مرجوعی اقدام کنید.";
}

/**
 * مقصدهای مجازِ `ChangePurchaseStatus` از وضعیتِ فعلی (به‌جز «لغو» که
 * دکمه و دیالوگِ خودش را دارد). خروج از پیش‌فاکتور شماره و تاریخِ
 * فاکتورِ ذخیره‌شده را لازم دارد.
 */
export function purchaseStatusTargets(purchase) {
  switch (purchase?.status) {
    case PURCHASE_STATUSES.PROFORMA:
      return purchase.invoiceNumber && purchase.invoiceDate
        ? [PURCHASE_STATUSES.PENDING, PURCHASE_STATUSES.SHIPPED]
        : [];
    case PURCHASE_STATUSES.PENDING:
      return [PURCHASE_STATUSES.SHIPPED];
    case PURCHASE_STATUSES.SHIPPED:
      return [PURCHASE_STATUSES.PENDING];
    default:
      return [];
  }
}

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
  if (purchase.status === PURCHASE_STATUSES.CANCELLED) return false;
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
  if (purchase.status === PURCHASE_STATUSES.CANCELLED) return false;
  return (Number(item.shortClosedQuantity) || 0) > 0;
}

// ─── وضعیتِ دستی ────────────────────────────────────────────────────────────

/**
 * وضعیت‌هایی که واحد خرید دستی انتخاب می‌کند — مراحلِ پیش از رسیدنِ کالا،
 * و همان سه وضعیتی که `CreatePurchase`/`UpdatePurchase` می‌پذیرند.
 * «تحویل ناقص/کامل» را فقط دریافتِ انبار تعیین می‌کند (سرور بعد از هر دورِ
 * دریافت از نو حسابش می‌کند) و «لغو» دکمه و دیالوگِ خودش را دارد.
 */
export const MANUAL_PURCHASE_STATUSES = [
  PURCHASE_STATUSES.PROFORMA,
  PURCHASE_STATUSES.PENDING,
  PURCHASE_STATUSES.SHIPPED,
];

/**
 * آیا وضعیتِ ذخیره‌شده دیگر دستی عوض نمی‌شود؟ بعد از اولین دریافت، برگرداندن
 * به «ارسال‌شده» یا «در انتظار» یا جلو بردن به «تحویل کامل» هر دو دروغ
 * گفتن به صفِ دریافتِ انبار است؛ خریدِ لغوشده هم بسته است.
 */
export function isPurchaseStatusLocked(savedStatus) {
  if (savedStatus === "" || savedStatus == null) return false;
  return !MANUAL_PURCHASE_STATUSES.includes(Number(savedStatus));
}
