import { createFilterStore } from "@/shared/store/createFilterStore";

/** فیلترهای لیستِ مرجوعی — نام‌ها همان پارامترهای `GetSaleReturnListQuery`. */
export const useSalesReturnFilterStore = createFilterStore({
  filters: {
    search: "",
    customerId: "",
    status: "",
    problem: "",
    fromDate: "",
    toDate: "",
  },
});
