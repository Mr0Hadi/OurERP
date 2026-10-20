import { createFilterStore } from "@/shared/store/createFilterStore";

/** فیلترهای لیستِ فروش — نام‌ها همان پارامترهای `GetSaleListQuery`. */
export const useSaleFilterStore = createFilterStore({
  filters: {
    invoiceNumber: "",
    customerId: "",
    status: "",
    // یک مرحله‌ی پیش‌فاکتور (`SaleProformaStageEnum`)؛ سرور چندتایی هم می‌پذیرد.
    proformaStages: "",
    paymentType: "",
    fromDate: "",
    toDate: "",
  },
});
