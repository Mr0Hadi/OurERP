import { createFilterStore } from "@/shared/store/createFilterStore";

export const useSaleFilterStore = createFilterStore({
  filters: {
    globalSearch: "",
    customerId: "",
    // `GetSaleList` فیلترِ شناسه ندارد و فقط `customerName`ِ متنی
    // می‌گیرد؛ پس نامِ انتخاب‌شده هم کنارِ شناسه نگه داشته می‌شود.
    customerName: "",
    status: "",
    paymentType: "",
    fromDate: "",
    toDate: "",
  },
});
