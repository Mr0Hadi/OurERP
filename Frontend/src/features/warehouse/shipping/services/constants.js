import { SALE_STATUSES } from "@/features/sales/orders/services/mockData";

export { SALE_STATUSES };

// فقط فروش‌هایی که تأیید شده‌اند ولی هنوز به‌طور کامل تحویل مشتری
// نشده‌اند در لیست انباردار برای آماده‌سازی/ارسال دیده می‌شوند.
// «تحویل ناقص» هم اینجا می‌ماند چون ممکن است باقیمانده با محموله‌ی
// بعدی ارسال شود.
export const SHIPPING_ELIGIBLE_STATUSES = [
  SALE_STATUSES.PROCESSING,
  SALE_STATUSES.PARTIALLY_DELIVERED,
];

export const SHIPPING_STATUS_LABELS = {
  [SALE_STATUSES.PROCESSING]: "در حال پردازش",
  [SALE_STATUSES.PARTIALLY_DELIVERED]: "تحویل ناقص",
};
