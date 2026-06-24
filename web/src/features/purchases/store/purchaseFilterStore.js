// src/features/purchases/store/purchaseFilterStore.js
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const usePurchaseFilterStore = create(
  devtools((set) => ({
    // فیلترهای جستجو
    globalSearch: '',
    supplierIds: [],
    status: '',
    paymentType: '',
    fromDate: '',
    toDate: '',

    // صفحه‌بندی
    pagination: {
      pageIndex: 0,
      pageSize: 10,
    },

    // مرتب‌سازی
    sorting: {
      id: 'createdAt',
      desc: true,
    },

    // اکشن‌ها
    setGlobalSearch: (value) =>
      set({ globalSearch: value, pagination: { pageIndex: 0, pageSize: 10 } }),
    setSupplierIds: (value) =>
      set({ supplierIds: value, pagination: { pageIndex: 0, pageSize: 10 } }),
    setStatus: (value) =>
      set({ status: value, pagination: { pageIndex: 0, pageSize: 10 } }),
    setPaymentType: (value) =>
      set({ paymentType: value, pagination: { pageIndex: 0, pageSize: 10 } }),
    setFromDate: (value) =>
      set({ fromDate: value, pagination: { pageIndex: 0, pageSize: 10 } }),
    setToDate: (value) =>
      set({ toDate: value, pagination: { pageIndex: 0, pageSize: 10 } }),

    setPagination: (newPagination) => set({ pagination: newPagination }),
    setSorting: (newSorting) =>
      set({ sorting: newSorting, pagination: { pageIndex: 0, pageSize: 10 } }),

    resetFilters: () =>
      set({
        globalSearch: '',
        supplierIds: [],
        status: '',
        paymentType: '',
        fromDate: '',
        toDate: '',
        pagination: { pageIndex: 0, pageSize: 10 },
        sorting: { id: 'createdAt', desc: true },
      }),
  }))
);

export default usePurchaseFilterStore;
