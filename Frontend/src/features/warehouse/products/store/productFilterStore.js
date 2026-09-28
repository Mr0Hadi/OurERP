import { createFilterStore } from "@/shared/store/createFilterStore";

/**
 * فیلترهای لیستِ کالا — نام‌ها همان پارامترهای `GetProductListQuery`.
 *
 * مرتب‌سازیِ پیش‌فرض ترتیبِ خودِ سرور (تازه‌ترین اول) است، نه بر اساس نام:
 * با مرتب‌سازی بر اساس نام، کالای تازه‌ساخته‌شده وسطِ لیست گم می‌شد.
 */
export const useProductFilterStore = createFilterStore({
  filters: {
    name: "",
    brand: "",
    productCategoryId: "",
    fromPrice: "",
    toPrice: "",
    isLowOnStock: "", // "" | "true" | "false"
    isIncomplete: "", // "" | "true" — فقط کالاهای «ساخت سریع» که هنوز کامل نشده‌اند
  },
  defaultSorting: null,
  actions: ({ applyFilters }) => ({
    setPriceRange: (fromPrice, toPrice) => applyFilters({ fromPrice, toPrice }),
  }),
});
