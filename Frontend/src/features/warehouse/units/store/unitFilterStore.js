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

/** کالاهای نیازمند برچسب — پیش‌فرض: بیشترین کمبود اول. */
export const usePendingLabelFilterStore = createFilterStore({
  filters: {
    globalSearch: "",
    category: "",
    onlyPending: true,
  },
  defaultSorting: { id: "missingCount", desc: true },
});

/** فهرست واحدهای ساخته‌شده — پیش‌فرض: تازه‌ترین اول. */
export const useProductUnitFilterStore = createFilterStore({
  filters: {
    globalSearch: "",
    productId: "",
    status: "",
    printState: "",
  },
});
