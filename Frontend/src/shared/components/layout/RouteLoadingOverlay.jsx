import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import { Spinner } from "@/shared/components/ui/spinner";
import { cn } from "@/shared/lib/utils";
import { onNavigationSettled, onNavigationStart } from "@/shared/lib/routeTransitionBus";

/**
 * اسپینرِ جابه‌جایی بین صفحه‌ها.
 *
 * از لحظه‌ی خودِ کلیک (رویِ `router.navigate`، نگاه کن به routers.jsx) روشن
 * می‌شود و وقتی خاموش می‌شود که صفحه‌ی تازه روی صفحه آمده باشد: روتر
 * به‌روزرسانی‌اش را در یک transition می‌گذارد، پس `useLocation()` تا وقتی کدِ
 * lazyِ صفحه دانلود و رندر نشده مسیرِ قبلی را نگه می‌دارد، و تغییرِ آن یعنی
 * «صفحه‌ی تازه واقعاً آمد».
 *
 * عمداً منتظرِ داده‌ی صفحه نمی‌ماند. هر صفحه برای داده‌ی خودش اسکلتون/خطا
 * دارد (`isLoading`)؛ نگه‌داشتنِ اسپینر تا رسیدنِ *همه‌ی* کوئری‌ها، آن اسکلتون را
 * پشتِ بلور پنهان می‌کرد و صفحه را به کندترین درخواستِ برنامه گره می‌زد —
 * از جمله فهرست‌های فرعیِ فیلتر، درخواست‌های مانده از صفحه‌ی قبل، و
 * کوئری‌ای که retry می‌کرد.
 *
 * سقفِ نمایش فقط شبکه‌ی ایمنی است برای ناوبریِ ناتمام.
 */
const MAX_VISIBLE_MS = 15000;

/**
 * `contained`: اسپینر فقط روی نزدیک‌ترین والدِ `relative` می‌افتد (ناحیه‌ی اصلیِ
 * سایت، نه سایدبار)؛ وگرنه کلِ پنجره را می‌پوشاند (صفحه‌های ورود).
 */
export default function RouteLoadingOverlay({ contained = false }) {
  const location = useLocation();
  // مسیری که الان واقعاً روی صفحه است (نه مسیرِ نشسته در `window.location` که
  // ممکن است ناوبریِ هنوز-درحال-بارگذاریِ قبلی باشد).
  const shownPathnameRef = useRef(location.pathname);
  useEffect(() => {
    shownPathnameRef.current = location.pathname;
  });

  // مسیری که ناوبری از آن شروع شد؛ `null` یعنی اسپینر خاموش است.
  const [startPathname, setStartPathname] = useState(null);

  // مسیر عوض شده یعنی صفحه‌ی تازه آمد؛ همان رندر خاموش می‌شود (نه در effect)
  // تا یک فریمِ اضافه اسپینر روی صفحه‌ی تازه نماند.
  if (startPathname !== null && location.pathname !== startPathname) {
    setStartPathname(null);
  }
  const visible = startPathname !== null;

  useEffect(
    () => onNavigationStart(() => setStartPathname(shownPathnameRef.current)),
    [],
  );
  // مسیرِ نهاییِ روتر همان است که الان روی صفحه است ← چیزی نمانده تا برسد.
  useEffect(
    () =>
      onNavigationSettled((pathname) => {
        if (pathname === shownPathnameRef.current) setStartPathname(null);
      }),
    [],
  );

  useEffect(() => {
    if (!visible) return undefined;
    const timer = setTimeout(() => setStartPathname(null), MAX_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "z-50 backdrop-blur-md animate-in fade-in duration-150",
        contained ? "absolute inset-0" : "fixed inset-0 flex items-center justify-center",
      )}
    >
      {contained ? (
        <div className="sticky top-[45svh] flex justify-center">
          <Spinner className="size-10 text-primary drop-shadow-md" />
        </div>
      ) : (
        <Spinner className="size-10 text-primary drop-shadow-md" />
      )}
    </div>
  );
}
