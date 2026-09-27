import { createFilterStore } from "@/shared/store/createFilterStore";

/** فیلترهای لیستِ خرید — نام‌ها همان پارامترهای `GetPurchaseListQuery`. */
export const usePurchaseFilterStore = createFilterStore({
  filters: {
    invoiceNumber: "",
    supplierId: "",
    status: "",
    paymentType: "",
    fromDate: "",
    toDate: "",
  },
});
