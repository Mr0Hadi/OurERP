import { create } from "zustand";

export const useSupplierFilterStore = create((set) => ({
  globalSearch: "",
  minDebtCredit: "",
  maxDebtCredit: "",
  balanceType: "all", // "all" | "debit" | "credit" | "none"
  pagination: { pageIndex: 0, pageSize: 10 },
  sorting: null,

  setQuickFilter: (type) => {
    switch (type) {
      case "debtors":
        set({ balanceType: "debit", minDebtCredit: "", maxDebtCredit: "" });
        break;
      case "creditors":
        set({ balanceType: "credit", minDebtCredit: "", maxDebtCredit: "" });
        break;
      case "zero":
        set({ balanceType: "none", minDebtCredit: "", maxDebtCredit: "" });
        break;
      default: // all
        set({ balanceType: "all", minDebtCredit: "", maxDebtCredit: "" });
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
      balanceType: "all",
    }),
}));