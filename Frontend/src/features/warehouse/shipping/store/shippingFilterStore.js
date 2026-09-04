import { createFilterStore } from "@/shared/store/createFilterStore";

export const useShippingFilterStore = createFilterStore({
  filters: {
    globalSearch: "",
    // کلید ترکیبی (customer:12 / supplier:3) چون صف ارسال هم به مشتری
    // می‌رود و هم به تامین‌کننده — همان قراردادی که صف دریافت دارد.
    counterpartyId: "",
    // '' = همه، 'sale' = ارسال فروش، 'return_replacement' = کالای
    // جایگزین، 'return_to_supplier' = عودت مازاد به تامین‌کننده
    type: "",
    fromDate: "",
    toDate: "",
  },
});
