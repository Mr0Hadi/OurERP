import { useEffect, useRef } from "react";

/**
 * یک مقدارِ محاسبه‌شده (مثلاً جمع مبلغ) را با فیلدی که کاربر می‌بیند
 * همگام نگه می‌دارد — همان لحظه‌ای که منبع محاسبه عوض شود، نه فقط یک
 * بار در ابتدا.
 *
 * onSync معمولاً حالتِ یک کامپوننتِ دیگر (مثلاً فرم والد) را عوض
 * می‌کند، پس همگام‌سازی در useEffect انجام می‌شود نه در خودِ رندر — آپدیت
 * کامپوننتِ دیگر حین رندرِ این یکی مجاز نیست.
 *
 * shouldSync اجازه می‌دهد همگام‌سازی فقط در حالت‌های خاص انجام شود
 * (مثلاً وقتی روش پرداخت تک‌مرحله‌ای است، نه نسیه یا ترکیبی).
 */
export function useSyncedComputedValue(computedValue, onSync, shouldSync = true) {
  const prevValue = useRef(computedValue);

  useEffect(() => {
    if (computedValue !== prevValue.current) {
      prevValue.current = computedValue;
      if (shouldSync) onSync(computedValue);
    }
  }, [computedValue, shouldSync, onSync]);
}
