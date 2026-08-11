import { createFilterStore } from "@/shared/store/createFilterStore";

const useSalesReturnFilterStore = createFilterStore({
  filters: {
    globalSearch: "",
    customerIds: [],
    status: "",
    reason: "",
    fromDate: "",
    toDate: "",
  },
});

export default useSalesReturnFilterStore;
