/**
 * پلِ سبک بینِ `router.navigate` (که در routers.jsx پَچ می‌شود) و
 * `RouteLoadingOverlay`. چون هم `<Link>` و هم `useNavigate()` هر دو در
 * نهایت همین یک متدِ رویِ نمونه‌ی روتر را صدا می‌زنند، اینجا تنها جایی
 * است که *هر* شروعِ ناوبری (چه از سایدبار، چه از یک دکمه‌ی برنامه‌نویسی‌شده)
 * را می‌شود، بدون دست‌کاریِ تک‌تکِ Linkها/دکمه‌ها، رهگیری کرد.
 */
const listeners = new Set();

export function notifyNavigationStart() {
  listeners.forEach((cb) => cb());
}

export function onNavigationStart(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
