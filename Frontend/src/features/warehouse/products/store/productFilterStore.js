import { createFilterStore } from "@/shared/store/createFilterStore";

/**
 * مرتب‌سازیِ پیش‌فرض «تازه‌ترین اول» است، نه بر اساس نام: با مرتب‌سازی
 * بر اساس نام، کالای تازه‌ساخته‌شده وسط لیست گم می‌شد و کاربر در
 * صفحه‌ی اول پیدایش نمی‌کرد.
 */
export const useProductFilterStore = createFilterStore({
  filters: {
    globalSearch: "",
    brand: "",
    productCategoryId: "",
    minPrice: "",
    maxPrice: "",
    stockStatus: "", // "" | "inStock" | "lowStock" | "outOfStock"
    isIncomplete: "", // "" | "true" — فقط کالاهای ساخته‌شده با «ساخت سریع» که هنوز کامل نشده‌اند
  },
  actions: ({ applyFilters }) => ({
    setPriceRange: (min, max) =>
      applyFilters({ minPrice: min, maxPrice: max }),
  }),
});
