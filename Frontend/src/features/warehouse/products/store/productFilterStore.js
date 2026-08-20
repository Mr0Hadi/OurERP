// features/warehouse/store/productFilterStore.js
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export const useProductFilterStore = create(
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

    // مرتب‌سازی — پیش‌فرض «تازه‌ترین اول»، همان قراردادی که
    // createFilterStore در shared برای بقیه‌ی لیست‌ها دارد. با مرتب‌سازی
    // پیش‌فرض بر اساس نام، کالای تازه‌ساخته‌شده وسط لیست گم می‌شد و کاربر
    // در صفحه‌ی اول پیدایش نمی‌کرد.
    sorting: {
      id: 'createdAt',
      desc: true,
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
        sorting: { id: 'createdAt', desc: true },
      }),
  }))
);
