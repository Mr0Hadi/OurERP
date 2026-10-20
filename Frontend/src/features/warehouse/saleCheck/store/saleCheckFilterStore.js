import { createFilterStore } from "@/shared/store/createFilterStore";

/** فیلترهای صفِ بررسیِ انبار — نام‌ها همان پارامترهای `GetSaleListQuery`. */
export const useSaleCheckFilterStore = createFilterStore({
  filters: {
    customerId: "",
  },
});
