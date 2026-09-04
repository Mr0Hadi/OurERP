import { createFilterStore } from "@/shared/store/createFilterStore";

export const usePurchaseReturnFilterStore = createFilterStore({
  filters: {
    globalSearch: "",
    supplierId: "",
    status: "",
    problem: "",
    scope: "",
    fromDate: "",
    toDate: "",
  },
});
