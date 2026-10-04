import { useEffect } from "react";
import { useBlocker } from "react-router-dom";

/**
 * جلوی ترکِ صفحه با تغییراتِ ذخیره‌نشده را می‌گیرد — هم ناوبریِ داخلِ برنامه
 * (از جمله رفتن از یک کارمند به کارمندِ دیگر در همین صفحه) و هم بستن/رفرشِ تب.
 *
 * `blocker` را به `UnsavedChangesDialog` بدهید.
 */
export function useUnsavedChangesGuard(dirty) {
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
