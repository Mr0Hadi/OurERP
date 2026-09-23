import { PURCHASE_STATUSES } from "../services/constants";

/**
 * حذف کامل خرید فقط زمانی مجاز است که هنوز هیچ اتفاق واقعی‌ای
 * (ارسال توسط تامین‌کننده، دریافت در انبار) برای آن رخ نداده باشد.
 *
 * «پیش‌فاکتور» هم اینجاست: سندی که هنوز فاکتور رسمی‌اش نرسیده، از
 * «در انتظار ارسال» هم عقب‌تر است.
 */
export function canDeletePurchase(purchase) {
  if (!purchase) return false;
  return (
    purchase.status === PURCHASE_STATUSES.PROFORMA ||
    purchase.status === PURCHASE_STATUSES.PENDING
  );
}

/**
 * لغو (نه حذف) خرید زمانی مجاز است که کالا ارسال شده باشد
 * ولی هنوز هیچ قلمی در انبار دریافت نشده باشد.
 * پس از اولین دریافت، خرید دیگر نه حذف می‌شود و نه لغو —
 * چون سابقه‌ی انبار و احتمالاً مالی روی آن ثبت شده است.
 */
export function canCancelPurchase(purchase) {
  if (!purchase) return false;
  if (purchase.status !== PURCHASE_STATUSES.SHIPPED) return false;
  const items = purchase.items || [];
  return items.every((item) => !(item.receivedQuantity > 0));
}

/**
 * برای نمایش پیام راهنما در جاهایی که نه حذف و نه لغو ممکن است
 */
export function getPurchaseLockReason(purchase) {
  if (!purchase) return null;
  if (canDeletePurchase(purchase) || canCancelPurchase(purchase)) return null;
  if (purchase.status === PURCHASE_STATUSES.CANCELLED) return null;
  return "این خرید دارای سابقه‌ی دریافت یا تسویه در انبار است و دیگر قابل حذف یا لغو نیست.";
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

// ─── ویرایشِ اقلامِ خریدِ ثبت‌شده ────────────────────────────────────────────

/**
 * قلمی که انبار از آن تحویل گرفته نه حذف می‌شود و نه کمتر از مقدارِ
 * رسیده (به‌علاوه‌ی مقدارِ بسته‌شده) می‌شود — وگرنه «مانده» منفی می‌شد و
 * دانه‌های دریافت‌شده به قلمی اشاره می‌کردند که دیگر نیست.
 */
export function itemEditErrors(savedItems = [], formItems = []) {
  const errors = [];
  savedItems.forEach((saved) => {
    const floor =
      (Number(saved.receivedQuantity) || 0) + (Number(saved.shortClosedQuantity) || 0);
    if (floor <= 0) return;
    const current = formItems.find(
      (item) => (item.id != null ? item.id === saved.id : item.productId === saved.productId),
    );
    if (!current) {
      errors.push(`«${saved.productName}» از انبار تحویل گرفته شده و قابل حذف نیست.`);
    } else if ((Number(current.quantity) || 0) < floor) {
      errors.push(
        `مقدارِ «${saved.productName}» نمی‌تواند کمتر از ${floor.toLocaleString("fa-IR")} (رسیده و بسته‌شده) باشد.`,
      );
    }
  });
  return errors;
}

// ─── وضعیتِ دستی ────────────────────────────────────────────────────────────

/**
 * وضعیت‌هایی که واحد خرید دستی انتخاب می‌کند — مراحلِ پیش از رسیدنِ کالا.
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
