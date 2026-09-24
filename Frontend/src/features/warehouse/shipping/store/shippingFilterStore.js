import { createFilterStore } from "@/shared/store/createFilterStore";
import { SHIPPING_AWAITING } from "../domain/shippingVocabulary";

export const useShippingFilterStore = createFilterStore({
  filters: {
    // `GetSaleListQuery.InvoiceNumber` — تنها جست‌وجوی متنی روی خودِ سند.
    globalSearch: "",
    // بکند اینجا `CustomerId` ندارد؛ فیلترِ مشتری روی *نام* است.
    customerName: "",
    // صفِ پیش‌فرض: «آماده‌سازی انبار» و «ارسال ناقص» با هم.
    status: SHIPPING_AWAITING,
    fromDate: "",
    toDate: "",
  },
});
