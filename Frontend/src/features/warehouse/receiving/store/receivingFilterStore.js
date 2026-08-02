import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useReceivingFilterStore = create(
  devtools((set) => ({
    globalSearch: '',
    type: '',
    counterpartyIds: [], // آرایه‌ای از کلیدهای ترکیبی: "customer:5" / "supplier:3"
    fromDate: '',
    toDate: '',
    pagination: { pageIndex: 0, pageSize: 10 },
    sorting: { id: 'createdAt', desc: true },

    setGlobalSearch: (value) => set({ globalSearch: value, pagination: { pageIndex: 0, pageSize: 10 } }),
    setType: (value) => set({ type: value, pagination: { pageIndex: 0, pageSize: 10 } }),
    setCounterpartyIds: (value) => set({ counterpartyIds: value, pagination: { pageIndex: 0, pageSize: 10 } }),
    setFromDate: (value) => set({ fromDate: value, pagination: { pageIndex: 0, pageSize: 10 } }),
    setToDate: (value) => set({ toDate: value, pagination: { pageIndex: 0, pageSize: 10 } }),
    setPagination: (newPagination) => set({ pagination: newPagination }),
    setSorting: (newSorting) => set({ sorting: newSorting, pagination: { pageIndex: 0, pageSize: 10 } }),

    resetFilters: () =>
      set({
        globalSearch: '', type: '', counterpartyIds: [], fromDate: '', toDate: '',
        pagination: { pageIndex: 0, pageSize: 10 },
        sorting: { id: 'createdAt', desc: true },
      }),
  }))
);

export default useReceivingFilterStore;