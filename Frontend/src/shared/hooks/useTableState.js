// shared/hooks/useTableState.js
import { create } from "zustand";

// factory برای ساخت store جداگانه برای هر entity
export const createTableStore = (initialFilters = {}) =>
  create((set) => ({
    ...initialFilters,
    pagination: { pageIndex: 0, pageSize: 10 },
    sorting: null,
    setPagination: (pagination) => set({ pagination }),
    setSorting: (sorting) => set({ sorting }),
    setFilter: (key, value) => set({ [key]: value }),
    resetFilters: () => set({ ...initialFilters, pagination: { pageIndex: 0, pageSize: 10 }, sorting: null }),
  }));
