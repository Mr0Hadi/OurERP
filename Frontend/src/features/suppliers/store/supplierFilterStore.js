import { createPartyFilterStore } from "@/features/partyAccount/store/createPartyFilterStore";

/** فیلترهای لیستِ تامین‌کنندگان — نام‌ها همان پارامترهای `GetSupplierListQuery`. */
export const useSupplierFilterStore = createPartyFilterStore("companyNameOrContactName");
