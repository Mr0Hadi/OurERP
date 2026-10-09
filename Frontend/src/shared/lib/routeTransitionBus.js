/**
 * پلِ سبک بینِ `router.navigate` (که در routers.jsx پَچ می‌شود) و
 * `RouteLoadingOverlay`. چون هم `<Link>` و هم `useNavigate()` هر دو در
 * نهایت همین یک متدِ رویِ نمونه‌ی روتر را صدا می‌زنند، اینجا تنها جایی
 * است که *هر* شروعِ ناوبری (چه از سایدبار، چه از یک دکمه‌ی برنامه‌نویسی‌شده)
 * را می‌شود، بدون دست‌کاریِ تک‌تکِ Linkها/دکمه‌ها، رهگیری کرد.
 *
 * هر ناوبری یک شماره می‌گیرد و گزارشِ «تمام شد»ِ ناوبریِ قدیمی‌تر نادیده
 * گرفته می‌شود؛ وگرنه ناوبریِ کندِ اول می‌توانست اسپینرِ ناوبریِ دومی را
 * که هنوز در جریان است خاموش کند.
 */
const startListeners = new Set();
const settledListeners = new Set();
let latestId = 0;

/** شروعِ یک ناوبری؛ شماره‌اش را برمی‌گرداند تا با `notifyNavigationSettled` برگردد. */
export function notifyNavigationStart() {
  latestId += 1;
  startListeners.forEach((cb) => cb());
  return latestId;
}

export function onNavigationStart(callback) {
  startListeners.add(callback);
  return () => startListeners.delete(callback);
}

/**
 * روتر ناوبریِ `id` را تمام کرد و مسیرِ نهاییِ خودش `pathname` است. اگر ناوبریِ
 * تازه‌تری شروع شده باشد نادیده گرفته می‌شود.
 */
export function notifyNavigationSettled(id, pathname) {
  if (id !== latestId) return;
  settledListeners.forEach((cb) => cb(pathname));
}

export function onNavigationSettled(callback) {
  settledListeners.add(callback);
  return () => settledListeners.delete(callback);
}
