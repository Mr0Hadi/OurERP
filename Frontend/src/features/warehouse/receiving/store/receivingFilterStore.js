import { createFilterStore } from "@/shared/store/createFilterStore";
import { PurchaseStatusEnum } from "@/shared/domain/enums/purchaseStatus";

export const useReceivingFilterStore = createFilterStore({
  filters: {
    // `GetPurchaseListQuery.InvoiceNumber` — تنها جست‌وجوی متنیِ این لیست.
    globalSearch: "",
    supplierId: "",
    // صف پیش‌فرض روی «ارسال شده» است؛ «تحویل ناقص» با همین فیلتر دیده می‌شود.
    status: PurchaseStatusEnum.SHIPPED,
    fromDate: "",
    toDate: "",
  },
});
