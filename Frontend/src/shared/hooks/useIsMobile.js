import { useSyncExternalStore } from "react";

const MOBILE_BREAKPOINT = 768;
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function subscribe(onChange) {
  const media = window.matchMedia(MOBILE_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

const getSnapshot = () => window.matchMedia(MOBILE_QUERY).matches;

/**
 * آیا عرض صفحه کمتر از breakpointِ موبایل (۷۶۸px) است؟
 *
 * با `matchMedia` فقط وقتی رندر می‌شود که از breakpoint عبور کنیم (نه روی
 * هر پیکسلِ resize)، و مقدارِ اولیه از همان رندرِ اول درست است — نسخه‌ی
 * قبلی ابتدا `false` برمی‌گرداند و سایدبار روی موبایل یک لحظه دسکتاپ دیده می‌شد.
 */
export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
