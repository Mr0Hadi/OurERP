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