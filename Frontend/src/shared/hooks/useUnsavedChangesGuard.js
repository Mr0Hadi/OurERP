import { useEffect } from "react";
import { useBlocker } from "react-router-dom";

import { useUpdateGuard } from "@/shared/services/updateSafety";

/**
 * جلوی ترکِ صفحه با تغییراتِ ذخیره‌نشده را می‌گیرد — هم ناوبریِ داخلِ برنامه
 * (از جمله رفتن از یک کارمند به کارمندِ دیگر در همین صفحه) و هم بستن/رفرشِ تب.
 *
 * `blocker` را به `UnsavedChangesDialog` بدهید.
 *
 * همین حالت در دفترِ بروزرسانیِ برنامه هم ثبت می‌شود (`useUpdateGuard`)، پس نسخه‌ی
 * تازه تا وقتی `dirty` است فعال نمی‌شود. `reason` همان دلیلی است که به کاربر
 * گفته می‌شود.
 */
export function useUnsavedChangesGuard(dirty, { reason } = {}) {
  useUpdateGuard({ dirty, reason });
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  return blocker;
}
