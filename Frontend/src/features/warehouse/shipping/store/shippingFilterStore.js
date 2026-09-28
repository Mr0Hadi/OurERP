import { createFilterStore } from "@/shared/store/createFilterStore";
import { SHIPPING_AWAITING } from "../domain/shippingVocabulary";

export const useShippingFilterStore = createFilterStore({
  filters: {
    // `GetSaleListQuery.InvoiceNumber` — تنها جست‌وجوی متنی روی خودِ سند.
    invoiceNumber: "",
    customerId: "",
    // فیلترِ صف، نه پارامترِ سرور: `shippingStatusesOf` آن را به `statuses` تبدیل می‌کند.
    // صفِ پیش‌فرض: «آماده‌سازی انبار» و «ارسال ناقص» با هم.
    status: SHIPPING_AWAITING,
    fromDate: "",
    toDate: "",
  },
});
