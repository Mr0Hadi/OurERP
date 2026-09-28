import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";

const pick = (state, keys) => Object.fromEntries(keys.map((key) => [key, state[key]]));

/**
 * فیلترهای یک استورِ لیست، آماده‌ی ارسال به کوئری.
 *
 * فقط ورودی‌های متنی (`text`) تأخیر می‌گیرند تا هر حرفِ تایپ یک درخواست
 * نسازد؛ Selectها و تاریخ‌ها (`instant`) با یک کلیک ست می‌شوند و تأخیرشان
 * فقط حسِ کندی می‌دهد. جای هوک‌های `useDebounced*Filters`ِ تکراریِ هر فیچر.
 *
 * @param {Function} useStore استورِ ساخته‌شده با `createFilterStore`
 * @param {{ text?: string[], instant?: string[] }} keys نامِ فیلدها (همان نامِ پارامترِ سرور)
 */
export function useDebouncedFilters(useStore, { text = [], instant = [] }) {
  const textValues = useStore(useShallow((state) => pick(state, text)));
  const instantValues = useStore(useShallow((state) => pick(state, instant)));
  const debouncedText = useDebouncedValue(textValues);

  return useMemo(
    () => ({ ...debouncedText, ...instantValues }),
    [debouncedText, instantValues],
  );
}
