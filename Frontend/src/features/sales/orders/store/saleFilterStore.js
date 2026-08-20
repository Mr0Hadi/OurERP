import { createFilterStore } from "@/shared/store/createFilterStore";

export const useSaleFilterStore = createFilterStore({
  filters: {
    globalSearch: "",
    customerIds: [],
    status: "",
    paymentType: "",
    fromDate: "",
    toDate: "",
  },
});
