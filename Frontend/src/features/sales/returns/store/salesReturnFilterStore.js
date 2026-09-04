import { createFilterStore } from "@/shared/store/createFilterStore";

export const useSalesReturnFilterStore = createFilterStore({
  filters: {
    globalSearch: "",
    customerId: "",
    status: "",
    problem: "",
    scope: "",
    fromDate: "",
    toDate: "",
  },
});
