import { createFilterStore } from "@/shared/store/createFilterStore";

/**
 * فیلترهای لیستِ کالا — نام‌ها همان پارامترهای `GetProductListQuery`.
 *
 * مرتب‌سازیِ پیش‌فرض ترتیبِ خودِ سرور (تازه‌ترین اول) است، نه بر اساس نام:
 * با مرتب‌سازی بر اساس نام، کالای تازه‌ساخته‌شده وسطِ لیست گم می‌شد.
 */
export const useProductFilterStore = createFilterStore({
  filters: {
    code: "", // جست‌وجوی کد/بارکد: کدِ کامل فقط همان کالا، نیمه‌کاره کالاهای مشابه
    name: "",
    brand: "",
    productCategoryId: "",
    vehicleId: "", // کالاهای همان خودرو + کالاهای «همه‌ی خودروها»
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
