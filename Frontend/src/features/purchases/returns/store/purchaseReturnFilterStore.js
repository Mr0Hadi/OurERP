import { createFilterStore } from "@/shared/store/createFilterStore";

/** فیلترهای لیستِ مرجوعی — نام‌ها همان پارامترهای `GetPurchaseReturnListQuery`. */
export const usePurchaseReturnFilterStore = createFilterStore({
  filters: {
    search: "",
    supplierId: "",
    status: "",
    problem: "",
    fromDate: "",
    toDate: "",
  },
});
