import { createFilterStore } from "@/shared/store/createFilterStore";

/** فیلترهای فهرستِ انبارگردانی‌ها، با همان نام‌های `GetStocktakeListQuery`. پیش‌فرضِ سرور: تازه‌ترین اول. */
export const useStocktakeFilterStore = createFilterStore({
  filters: {
    search: "",
    statuses: [],
    fromDate: "",
    toDate: "",
    warehouseId: "",
  },
  defaultSorting: { id: "createdAt", desc: true },
});
