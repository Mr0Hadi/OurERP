import { create } from "zustand";
import { BalanceTypeEnum } from "@/shared/domain/enums/balanceType";

export const useSupplierFilterStore = create((set) => ({
  globalSearch: "",
  minDebtCredit: "",
  maxDebtCredit: "",
  balanceType: "all", // "all" | BalanceTypeEnum
  pagination: { pageIndex: 0, pageSize: 10 },
  sorting: null,

  setQuickFilter: (type) => {
    switch (type) {
      case "debtors":
        set({ balanceType: BalanceTypeEnum.DEBTOR, minDebtCredit: "", maxDebtCredit: "" });
        break;
      case "creditors":
        set({ balanceType: BalanceTypeEnum.CREDITOR, minDebtCredit: "", maxDebtCredit: "" });
        break;
      case "zero":
        set({ balanceType: BalanceTypeEnum.BALANCED, minDebtCredit: "", maxDebtCredit: "" });
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