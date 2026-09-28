import { createFilterStore } from "@/shared/store/createFilterStore";
import { RECEIVING_AWAITING } from "../domain/receivingVocabulary";

export const useReceivingFilterStore = createFilterStore({
  filters: {
    // `GetPurchaseListQuery.InvoiceNumber` — تنها جست‌وجوی متنیِ این لیست.
    invoiceNumber: "",
    supplierId: "",
    // فیلترِ صف، نه پارامترِ سرور: `receivingStatusesOf` آن را به `statuses` تبدیل می‌کند.
    // صفِ پیش‌فرض: «ارسال شده» و «تحویل ناقص» با هم.
    status: RECEIVING_AWAITING,
    fromDate: "",
    toDate: "",
  },
});
