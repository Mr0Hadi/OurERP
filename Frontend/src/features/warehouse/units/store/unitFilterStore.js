import { create } from "zustand";
import { persist } from "zustand/middleware";

import { createFilterStore } from "@/shared/store/createFilterStore";
import { DEFAULT_SHEET_PRESET } from "@/shared/components/print/sheetPresets";
import { DEFAULT_LABEL_CODE_KIND } from "@/shared/domain/barcode/barcodeConfig";
import { UNIT_VIEWS } from "../domain/unitVocabulary";

/**
 * اندازه‌ی ورقِ برچسب و بارکد/QR به پرینتر و اسکنرِ انبار بستگی دارند، نه
 * به این دسته‌ی خاص؛ پس بینِ نشست‌ها هم می‌مانند.
 */
export const usePrintPreferenceStore = create(
  persist(
    (set) => ({
      sheetPresetKey: DEFAULT_SHEET_PRESET,
      setSheetPresetKey: (sheetPresetKey) => set({ sheetPresetKey }),

      labelCodeKind: DEFAULT_LABEL_CODE_KIND,
      setLabelCodeKind: (labelCodeKind) => set({ labelCodeKind }),
    }),
    { name: "unit-label-print-preferences" },
  ),
);

/** فیلترهایی که از آدرس (`?productId=…`) هم پر می‌شوند — پیوند از صفحه‌های دیگر. */
export const URL_FILTER_KEYS = Object.freeze([
  "view",
  "productId",
  "status",
  "custodyReason",
  "labelState",
  "purchaseId",
  "saleId",
  "supplierId",
  "customerId",
]);

const EMPTY_FILTERS = {
  view: UNIT_VIEWS.ALL,
  search: "",
  productId: "",
  status: "",
  custodyReason: "",
  labelState: "",
  supplierId: "",
  customerId: "",
  purchaseId: "",
  saleId: "",
  fromDate: "",
  toDate: "",
  fromSerial: "",
  toSerial: "",
};

/**
 * فیلترهای صفحه‌ی دانه‌ها. `view` تبِ فعال است و فیلترِ ثابتِ خودش را
 * (قرنطینه، صفِ چاپ) در `effectiveUnitFilters` اضافه می‌کند؛ بقیه‌ی
 * فیلترها بینِ تب‌ها مشترک‌اند تا مثلاً «کالای X» با عوض کردنِ تب بماند.
 */
export const useProductUnitFilterStore = createFilterStore({
  filters: EMPTY_FILTERS,
  defaultSorting: null,
  defaultPageSize: 20,
  actions: ({ applyFilters }) => ({
    // سریال per-product است (هر کالا از ۱ می‌شمارد)، پس بازه‌ی سریالِ
    // کالای قبلی برای کالای جدید بی‌معناست.
    setProductId: (productId) =>
      applyFilters({ productId, fromSerial: "", toSerial: "" }),
    // تبِ قرنطینه وضعیت را خودش ثابت می‌کند و علتِ قرنطینه فقط آنجا معنا دارد.
    setView: (view) =>
      applyFilters(
        view === UNIT_VIEWS.QUARANTINE
          ? { view, status: "" }
          : { view, custodyReason: "" },
      ),
    /** پیوندِ ورودی: همه‌ی فیلترها از نو، فقط با همین مقادیر. */
    openWith: (values) => applyFilters({ ...EMPTY_FILTERS, ...values }),
  }),
});
