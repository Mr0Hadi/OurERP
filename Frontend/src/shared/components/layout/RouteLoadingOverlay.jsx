import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useIsFetching } from "@tanstack/react-query";

import { Spinner } from "@/shared/components/ui/spinner";
import { onNavigationStart } from "@/shared/lib/routeTransitionBus";

/**
 * اسپینرِ جابه‌جایی بین صفحه‌ها.
 *
 * از لحظه‌ی خودِ کلیک (رویِ `router.navigate`، نگاه کن به routers.jsx) روشن
 * می‌شود، و فقط وقتی خاموش می‌شود که صفحه‌ی تازه واقعاً آماده باشد:
 *
 *   ۱. آدرس عوض شده باشد — یعنی کدِ lazyِ صفحه بار شده و رندر شده؛
 *   ۲. هیچ کوئری‌ای که هنوز داده‌ی اولیه‌اش نرسیده در جریان نباشد — یعنی
 *      داده‌ای که صفحه برای نمایش لازم دارد رسیده است.
 *
 * نسخه‌ی قبلی با عوض‌شدنِ آدرس (یا بعد از ۴ ثانیه) خاموش می‌شد، در
 * حالی که صفحه هنوز داده‌اش را می‌گرفت یا chunkش در حال دانلود بود.
 *
 * رفرشِ پس‌زمینه‌ی کوئری‌ای که از قبل داده دارد صفحه را نگه نمی‌دارد، و
 * سقفِ نمایش فقط یک شبکه‌ی ایمنی است برای ناوبریِ ناتمام.
 */
const MAX_VISIBLE_MS = 15000;
// کوئری‌های صفحه‌ی تازه در effectِ اولین رندرش شروع می‌شوند؛ کمی صبر
// می‌شود تا «هیچ کوئری‌ای در جریان نیست» یعنی واقعاً هیچ، نه «هنوز شروع نشده».
const SETTLE_DELAY_MS = 150;

const isInitialLoad = (query) => query.state.data === undefined;

export default function RouteLoadingOverlay() {
  const location = useLocation();
  // مسیری که ناوبری از آن شروع شد؛ `null` یعنی اسپینر خاموش است.
  const [startPathname, setStartPathname] = useState(null);
  const visible = startPathname !== null;
  const setVisible = (on) => {
    if (!on) setStartPathname(null);
  };
  const pendingInitialLoads = useIsFetching({ predicate: isInitialLoad });

  useEffect(
    () => onNavigationStart(() => setStartPathname(window.location.pathname)),
    [],
  );

  useEffect(() => {
    if (!visible) return undefined;
    const timer = setTimeout(() => setVisible(false), MAX_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  const hasArrived = visible && location.pathname !== startPathname;

  useEffect(() => {
    if (!hasArrived || pendingInitialLoads > 0) return undefined;
    const timer = setTimeout(() => setVisible(false), SETTLE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [hasArrived, pendingInitialLoads]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md animate-in fade-in duration-150">
      <Spinner className="size-10 text-primary drop-shadow-md" />
    </div>
  );
}
