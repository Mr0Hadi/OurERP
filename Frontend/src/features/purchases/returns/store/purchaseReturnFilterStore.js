import { createFilterStore } from "@/shared/store/createFilterStore";

export const usePurchaseReturnFilterStore = createFilterStore({
  filters: {
    globalSearch: "",
    supplierIds: [],
    status: "",
    problem: "",
    scope: "",
    fromDate: "",
    toDate: "",
  },
});
