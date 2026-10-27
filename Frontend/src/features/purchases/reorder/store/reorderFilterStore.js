import { createFilterStore } from "@/shared/store/createFilterStore";

/**
 * فیلترهای پیشنهادِ خرید، با همان نام‌های `GetReorderSuggestionListQuery`. صفحه‌بندی و مرتب‌سازی سمتِ کاربرند
 * (`reorderPage`)؛ پیش‌فرض همان ترتیبِ سرور: تامین‌کننده.
 */
export const useReorderFilterStore = createFilterStore({
  filters: {
    search: "",
    supplierId: "",
  },
  defaultSorting: { id: "supplierName", desc: false },
});
