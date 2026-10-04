import { ROUTES } from "@/shared/constants/routes";

/** کشِ پاسخ‌های API که نسخه‌های قبلیِ service worker می‌ساختند (دیگر ساخته نمی‌شود). */
const LEGACY_API_CACHE = "api-cache";

/**
 * پاک‌کردنِ کشِ قدیمیِ پاسخ‌های API از Cache Storage. نصب‌های قبلی تا یک ساعت
 * پاسخ‌های مالی را آن‌جا نگه می‌داشتند — مستقل از کاربر و حتی بعد از خروج.
 */
export function purgeLegacyApiCache() {
  if (typeof caches === "undefined") return Promise.resolve();
  return caches.delete(LEGACY_API_CACHE).catch(() => {});
}

/**
 * بعد از خروج: صفحه‌ی ورود با بارگذاریِ کامل، نه ناوبریِ درون‌برنامه. همه‌ی
 * stateهای درونِ حافظه (پیش‌نویسِ فاکتورِ نیمه‌کاره، پرداخت‌های ثبت‌نشده،
 * فیلترها) با همین پاک می‌شوند و کاربرِ بعدیِ همان دستگاه آن‌ها را نمی‌بیند.
 */
export async function leaveSession() {
  await purgeLegacyApiCache();
  window.location.replace(ROUTES.LOGIN);
}
