import { createFilterStore } from "@/shared/store/createFilterStore";
import { RECEIVING_AWAITING } from "../domain/receivingVocabulary";

export const useReceivingFilterStore = createFilterStore({
  filters: {
    // `GetPurchaseListQuery.InvoiceNumber` — تنها جست‌وجوی متنیِ این لیست.
    globalSearch: "",
    supplierId: "",
    // صفِ پیش‌فرض: «ارسال شده» و «تحویل ناقص» با هم.
    status: RECEIVING_AWAITING,
    fromDate: "",
    toDate: "",
  },
});
