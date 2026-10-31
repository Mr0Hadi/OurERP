import { createFilterStore } from "@/shared/store/createFilterStore";

/** فیلترهای فهرستِ دریافت/پرداختِ علی‌الحساب، با همان نام‌های `GetPartyPaymentListQuery`. */
export const usePartyPaymentFilterStore = createFilterStore({
  filters: {
    search: "",
    customerId: "",
    supplierId: "",
    direction: "",
    bankAccountId: "",
    hasUnallocated: "",
    includeVoided: false,
    fromDate: "",
    toDate: "",
  },
  // پیش‌فرضِ سرور: جدیدترین اول.
  defaultSorting: { id: "paidAt", desc: true },
});
