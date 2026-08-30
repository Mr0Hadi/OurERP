// src/features/warehouse/units/store/unitFilterStore.js
import { create } from "zustand";

import { createFilterStore } from "@/shared/store/createFilterStore";
import { DEFAULT_SHEET_PRESET } from "@/shared/components/print/sheetPresets";

/**
 * انتخاب اندازه‌ی برچسب یک تصمیمِ یک‌بار در روز است، نه هر بار چاپ؛
 * انباردار همان ورقی را دارد که در پرینتر گذاشته.
 */
export const usePrintPreferenceStore = create((set) => ({
  sheetPresetKey: DEFAULT_SHEET_PRESET,
  setSheetPresetKey: (sheetPresetKey) => set({ sheetPresetKey }),
}));

/** فهرست واحدهای ساخته‌شده — پیش‌فرض: تازه‌ترین اول. */
export const useProductUnitFilterStore = createFilterStore({
  filters: {
    globalSearch: "",
    productId: "",
    status: "",
  },
});
