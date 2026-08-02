import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useSalesReturnFilterStore = create(
  devtools((set) => ({
    globalSearch: '',
    customerIds: [],
    status: '',
    reason: '',
    fromDate: '',
    toDate: '',
    pagination: { pageIndex: 0, pageSize: 10 },
    sorting: { id: 'createdAt', desc: true },

    setGlobalSearch: (value) =>
      set({ globalSearch: value, pagination: { pageIndex: 0, pageSize: 10 } }),
    setCustomerIds: (value) =>
      set({ customerIds: value, pagination: { pageIndex: 0, pageSize: 10 } }),
    setStatus: (value) =>
      set({ status: value, pagination: { pageIndex: 0, pageSize: 10 } }),
    setReason: (value) =>
      set({ reason: value, pagination: { pageIndex: 0, pageSize: 10 } }),
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
        customerIds: [],
        status: '',
        reason: '',
        fromDate: '',
        toDate: '',
        pagination: { pageIndex: 0, pageSize: 10 },
        sorting: { id: 'createdAt', desc: true },
      }),
  })),
);

export default useSalesReturnFilterStore;
