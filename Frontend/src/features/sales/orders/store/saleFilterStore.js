import { createFilterStore } from "@/shared/store/createFilterStore";

/** فیلترهای لیستِ فروش — نام‌ها همان پارامترهای `GetSaleListQuery`. */
export const useSaleFilterStore = createFilterStore({
  filters: {
    invoiceNumber: "",
    // فقط برای نمایشِ انتخابِ کشویی؛ به سرور نمی‌رود. `GetSaleList` هنوز
    // `CustomerId` ندارد (بندِ ۶ بخشِ ۳ سندِ frontend-requests.fa.md) و
    // با `customerName`ِ متنی فیلتر می‌کند.
    customerId: "",
    customerName: "",
    status: "",
    paymentType: "",
    fromDate: "",
    toDate: "",
  },
});
