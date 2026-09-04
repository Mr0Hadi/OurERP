import { createFilterStore } from "@/shared/store/createFilterStore";

export const useReceivingFilterStore = createFilterStore({
  filters: {
    globalSearch: "",
    type: "",
    // کلیدهای ترکیبی: "customer:5" / "supplier:3"
    counterpartyId: "",
    fromDate: "",
    toDate: "",
  },
});
