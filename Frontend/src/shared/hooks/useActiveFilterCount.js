import { useStore as useZustandStore } from "zustand";

const EMPTY = {};

const isEmptyValue = (value) =>
  value === "" || value === null || value === undefined ||
  (Array.isArray(value) && value.length === 0);

/**
 * تعدادِ فیلترهایی که با مقدارِ پیش‌فرضِ استور فرق دارند.
 *
 * فقط برای استورهای `createFilterStore` (که `filterDefaults` دارند)؛ بقیه `0`.
 * فیلدهایی که با هم یک فیلترند (مثلِ از/تا) جدا شمرده می‌شوند — برای نشانِ
 * دکمه همین کافی است.
 */
export function useActiveFilterCount(useStore) {
  const defaults = useStore?.filterDefaults ?? EMPTY;
  return useZustandStore(useStore ?? FALLBACK_STORE, (state) => {
    let count = 0;
    for (const key in defaults) {
      const value = state[key];
      if (value === defaults[key] || (isEmptyValue(value) && isEmptyValue(defaults[key]))) continue;
      if (JSON.stringify(value) === JSON.stringify(defaults[key])) continue;
      count += 1;
    }
    return count;
  });
}

// تا هوک بدونِ استور هم شرطی صدا زده نشود.
const FALLBACK_STORE = {
  getState: () => EMPTY,
  getInitialState: () => EMPTY,
  subscribe: () => () => {},
};
