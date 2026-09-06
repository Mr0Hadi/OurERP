import { createFilterStore } from "@/shared/store/createFilterStore";
import { BalanceTypeEnum } from "@/shared/domain/enums/balanceType";

/** میان‌برهای نوار بالای لیست، به مقدار `balanceType` ترجمه می‌شوند. */
const QUICK_FILTER_BALANCE = {
  debtors: BalanceTypeEnum.DEBTOR,
  creditors: BalanceTypeEnum.CREDITOR,
  zero: BalanceTypeEnum.BALANCED,
};

export const useSupplierFilterStore = createFilterStore({
  filters: {
    globalSearch: "",
    idSearch: "",
    minDebtCredit: "",
    maxDebtCredit: "",
    balanceType: "all", // "all" | BalanceTypeEnum
  },
  defaultSorting: null,
  actions: ({ applyFilters }) => ({
    // میان‌بر بازه‌ی عددی را هم پاک می‌کند: این دو راهِ رقیبِ بیان یک
    // چیزند و با هم فعال بمانند، نتیجه‌ی لیست غیرقابل‌توضیح می‌شود.
    setQuickFilter: (type) =>
      applyFilters({
        balanceType: QUICK_FILTER_BALANCE[type] ?? "all",
        minDebtCredit: "",
        maxDebtCredit: "",
      }),
    setDebtCreditRange: (min, max) =>
      applyFilters({ minDebtCredit: min, maxDebtCredit: max }),
  }),
});
