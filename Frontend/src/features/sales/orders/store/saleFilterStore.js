import { createFilterStore } from "@/shared/store/createFilterStore";

/** فیلترهای لیستِ فروش — نام‌ها همان پارامترهای `GetSaleListQuery`. */
export const useSaleFilterStore = createFilterStore({
  filters: {
    invoiceNumber: "",
    customerId: "",
    status: "",
    paymentType: "",
    fromDate: "",
    toDate: "",
  },
});
