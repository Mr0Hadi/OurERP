import { createFilterStore } from "@/shared/store/createFilterStore";

const useReceivingFilterStore = createFilterStore({
  filters: {
    globalSearch: "",
    type: "",
    // کلیدهای ترکیبی: "customer:5" / "supplier:3"
    counterpartyIds: [],
    fromDate: "",
    toDate: "",
  },
});

export default useReceivingFilterStore;
