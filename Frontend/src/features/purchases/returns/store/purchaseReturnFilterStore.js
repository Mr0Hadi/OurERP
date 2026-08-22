import { createFilterStore } from "@/shared/store/createFilterStore";

export const usePurchaseReturnFilterStore = createFilterStore({
  filters: {
    globalSearch: "",
    supplierIds: [],
    status: "",
    reason: "",
    fromDate: "",
    toDate: "",
  },
});
