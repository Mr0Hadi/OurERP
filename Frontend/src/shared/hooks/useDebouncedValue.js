import { useEffect, useState } from "react";

export const FILTER_DEBOUNCE_MS = 400;

/** مقدار را با تأخیر برمی‌گرداند تا هر بار تایپ کاربر یک درخواست نسازد. */
export function useDebouncedValue(value, delay = FILTER_DEBOUNCE_MS) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
