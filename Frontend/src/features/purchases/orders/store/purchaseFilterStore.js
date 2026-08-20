import { createFilterStore } from "@/shared/store/createFilterStore";

export const usePurchaseFilterStore = createFilterStore({
  filters: {
    globalSearch: "",
    supplierIds: [],
    status: "",
    paymentType: "",
    fromDate: "",
    toDate: "",
  },
});
