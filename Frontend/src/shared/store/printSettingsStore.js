import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * تنظیماتِ چاپِ هر نوع برگه (کاغذ، حاشیه، ستون‌ها، اندازه‌ی متن…) به
 * پرینترِ همین دستگاه بستگی دارد، نه به سند؛ پس بینِ نشست‌ها می‌ماند. هر
 * نوع برگه با کلیدِ خودش (`kind`) جداست تا لیست قیمت‌ها کاغذِ تصویرِ سندها را
 * عوض نکند.
 *
 * فقط آنچه کاربر عوض کرده ذخیره می‌شود؛ پیش‌فرض‌ها از خودِ برگه می‌آیند
 * (`usePrintSettings`)، پس گزینه‌ی تازه‌ای که بعداً اضافه شود در ذخیره‌ی
 * قدیمیِ مرورگر گم نمی‌شود.
 */
export const usePrintSettingsStore = create(
  persist(
    (set) => ({
      byKind: {},
      update: (kind, patch) =>
        set((state) => ({ byKind: { ...state.byKind, [kind]: { ...state.byKind[kind], ...patch } } })),
      reset: (kind) =>
        set((state) => {
          const byKind = { ...state.byKind };
          delete byKind[kind];
          return { byKind };
        }),
    }),
    { name: "print-settings", version: 1 },
  ),
);

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

/** پیش‌فرض + ذخیره؛ شیءهای تودرتو (مثلِ `columns`) هم کلید‌به‌کلید ادغام می‌شوند. */
function mergeSettings(defaults, saved) {
  if (!saved) return defaults;
  const merged = { ...defaults };
  for (const [key, value] of Object.entries(saved)) {
    merged[key] = isPlainObject(defaults[key]) && isPlainObject(value) ? { ...defaults[key], ...value } : value;
  }
  return merged;
}

/**
 * تنظیماتِ چاپِ یک نوع برگه.
 *
 * @param kind     کلیدِ پایدارِ نوعِ برگه (مثلاً `"price-list"`)؛ عوض‌کردنش تنظیمِ ذخیره‌شده را دور می‌اندازد.
 * @param defaults پیش‌فرض‌های کامل؛ شیءِ ثابتِ ماژول باشد.
 * @returns `{ settings, update(patch), reset() }`
 */
export function usePrintSettings(kind, defaults) {
  const saved = usePrintSettingsStore((state) => state.byKind[kind]);
  const updateKind = usePrintSettingsStore((state) => state.update);
  const resetKind = usePrintSettingsStore((state) => state.reset);

  return {
    settings: mergeSettings(defaults, saved),
    update: (patch) => updateKind(kind, patch),
    reset: () => resetKind(kind),
  };
}
