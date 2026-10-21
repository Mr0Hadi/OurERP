import { createFilterStore } from "@/shared/store/createFilterStore";

/** فیلترهای صفِ صندوق — نام‌ها همان پارامترهای `GetSaleListQuery`. */
export const useCashierFilterStore = createFilterStore({
  filters: {
    customerId: "",
  },
});
