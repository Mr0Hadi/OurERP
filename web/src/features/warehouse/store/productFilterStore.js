// features/warehouse/store/productFilterStore.js
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useProductFilterStore = create(
  devtools((set) => ({
    // فیلترهای جستجو
    globalSearch: '',
    brand: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    stockStatus: '', // 'inStock', 'lowStock', 'outOfStock'

    // صفحه‌بندی
    pagination: {
      pageIndex: 0,
      pageSize: 10,
    },

    // مرتب‌سازی
    sorting: {
      id: 'name', // فیلد پیش‌فرض
      desc: false,
    },

    // اکشن‌ها
    setGlobalSearch: (value) => set({ globalSearch: value, pagination: { pageIndex: 0, pageSize: 10 } }),
    setBrand: (value) => set({ brand: value, pagination: { pageIndex: 0, pageSize: 10 } }),
    setCategory: (value) => set({ category: value, pagination: { pageIndex: 0, pageSize: 10 } }),
    setPriceRange: (min, max) => set({ minPrice: min, maxPrice: max, pagination: { pageIndex: 0, pageSize: 10 } }),
    setStockStatus: (value) => set({ stockStatus: value, pagination: { pageIndex: 0, pageSize: 10 } }),

    setPagination: (newPagination) => set({ pagination: newPagination }),
    setSorting: (newSorting) => set({ sorting: newSorting, pagination: { pageIndex: 0, pageSize: 10 } }),

    resetFilters: () =>
      set({
        globalSearch: '',
        brand: '',
        category: '',
        minPrice: '',
        maxPrice: '',
        stockStatus: '',
        pagination: { pageIndex: 0, pageSize: 10 },
        sorting: { id: 'name', desc: false },
      }),
  }))
);

export default useProductFilterStore;