import { create } from "zustand";

export const useSupplierFilterStore = create((set) => ({
  globalSearch: "",
  minDebtCredit: "",
  maxDebtCredit: "",
  pagination: { pageIndex: 0, pageSize: 10 },
  sorting: null,

  setQuickFilter: (type) => {
    switch (type) {
      case "debtors":
        set({ minDebtCredit: "1", maxDebtCredit: "999999999" });
        break;
      case "creditors":
        set({ minDebtCredit: "-999999999", maxDebtCredit: "-1" });
        break;
      case "zero":
        set({ minDebtCredit: "0", maxDebtCredit: "0" });
        break;
      default: // all
        set({ minDebtCredit: "", maxDebtCredit: "" });
    }
  },
  setGlobalSearch: (value) => set({ globalSearch: value }),
  setDebtCreditRange: (min, max) =>
    set({ minDebtCredit: min, maxDebtCredit: max }),
  setPagination: (pagination) => set({ pagination }),
  setSorting: (sorting) => set({ sorting }),
  resetFilters: () =>
    set({
      globalSearch: "",
      minDebtCredit: "",
      maxDebtCredit: "",
    }),
}));
