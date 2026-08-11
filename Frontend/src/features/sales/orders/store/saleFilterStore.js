import { createFilterStore } from "@/shared/store/createFilterStore";

const useSaleFilterStore = createFilterStore({
  filters: {
    globalSearch: "",
    customerIds: [],
    status: "",
    paymentType: "",
    fromDate: "",
    toDate: "",
  },
});

export default useSaleFilterStore;
