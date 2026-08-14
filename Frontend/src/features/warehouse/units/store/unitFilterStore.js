// src/features/warehouse/units/store/unitFilterStore.js
import { createFilterStore } from "@/shared/store/createFilterStore";

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
