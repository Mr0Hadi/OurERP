import { createFilterStore } from "@/shared/store/createFilterStore";
import { SaleStatusEnum } from "@/shared/domain/enums/saleStatus";

export const useShippingFilterStore = createFilterStore({
  filters: {
    // `GetSaleListQuery.InvoiceNumber` — تنها جست‌وجوی متنی روی خودِ سند.
    globalSearch: "",
    // بکند اینجا `CustomerId` ندارد؛ فیلترِ مشتری روی *نام* است.
    customerName: "",
    // صف پیش‌فرض روی «آماده‌سازی انبار» است؛ «ارسال ناقص» با همین فیلتر دیده می‌شود.
    status: SaleStatusEnum.PROCESSING,
    fromDate: "",
    toDate: "",
  },
});
