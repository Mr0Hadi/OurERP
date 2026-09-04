import { createFilterStore } from "@/shared/store/createFilterStore";

export const usePurchaseFilterStore = createFilterStore({
  filters: {
    globalSearch: "",
    supplierId: "",
    status: "",
    paymentType: "",
    fromDate: "",
    toDate: "",
  },
});
