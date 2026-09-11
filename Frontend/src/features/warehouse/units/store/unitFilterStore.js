import { create } from "zustand";

import { createFilterStore } from "@/shared/store/createFilterStore";
import { DEFAULT_SHEET_PRESET } from "@/shared/components/print/sheetPresets";
import { DEFAULT_LABEL_CODE_KIND } from "@/shared/domain/barcode/barcodeConfig";

/**
 * انتخاب اندازه‌ی برچسب یک تصمیمِ یک‌بار در روز است، نه هر بار چاپ؛
 * انباردار همان ورقی را دارد که در پرینتر گذاشته.
 *
 * انتخابِ بارکد یا QR هم دقیقاً از همین جنس است و به دستگاهِ اسکنِ انبار
 * بستگی دارد نه به این دسته‌ی خاصِ برچسب، پس کنارِ همان می‌نشیند.
 */
export const usePrintPreferenceStore = create((set) => ({
  sheetPresetKey: DEFAULT_SHEET_PRESET,
  setSheetPresetKey: (sheetPresetKey) => set({ sheetPresetKey }),

  labelCodeKind: DEFAULT_LABEL_CODE_KIND,
  setLabelCodeKind: (labelCodeKind) => set({ labelCodeKind }),
}));

/**
 * فیلترهای فهرستِ دانه‌ها — دقیقاً همان‌هایی که `GetProductUnitList`
 * می‌شناسد: `productId`، `status` و بازه‌ی سریال. جست‌وجوی متنی و
 * مرتب‌سازی را سرور ندارد (ترتیب همیشه کالا، سپس سریال است)، پس اینجا
 * هم نیستند تا کاربر فیلتری نبیند که اعمال نمی‌شود.
 */
export const useProductUnitFilterStore = createFilterStore({
  filters: {
    productId: "",
    status: "",
    fromSerial: "",
    toSerial: "",
  },
  defaultSorting: null,
  actions: ({ applyFilters }) => ({
    // سریال per-product است (هر کالا از ۱ می‌شمارد)، پس بازه‌ی سریالِ
    // کالای قبلی برای کالای جدید بی‌معناست و با عوض‌شدنِ کالا پاک می‌شود.
    setProductId: (productId) =>
      applyFilters({ productId, fromSerial: "", toSerial: "" }),
  }),
});
