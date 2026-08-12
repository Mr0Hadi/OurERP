import { createFilterStore } from "@/shared/store/createFilterStore";

export const useShippingFilterStore = createFilterStore({
  filters: {
    globalSearch: "",
    customerIds: [],
    // '' = همه، 'sale' = فقط ارسال فروش، 'return_replacement' = فقط ارسال جایگزین
    type: "",
    fromDate: "",
    toDate: "",
  },
});
