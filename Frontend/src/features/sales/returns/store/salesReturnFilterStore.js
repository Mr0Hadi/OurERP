import { createFilterStore } from "@/shared/store/createFilterStore";

export const useSalesReturnFilterStore = createFilterStore({
  filters: {
    globalSearch: "",
    customerIds: [],
    status: "",
    reason: "",
    fromDate: "",
    toDate: "",
  },
});
