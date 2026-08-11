import { createFilterStore } from "@/shared/store/createFilterStore";

const usePurchaseFilterStore = createFilterStore({
  filters: {
    globalSearch: "",
    supplierIds: [],
    status: "",
    paymentType: "",
    fromDate: "",
    toDate: "",
  },
});

export default usePurchaseFilterStore;
