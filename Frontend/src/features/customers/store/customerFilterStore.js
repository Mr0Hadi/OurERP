import { createPartyFilterStore } from "@/features/partyAccount/store/createPartyFilterStore";

/** فیلترهای لیستِ مشتریان — نام‌ها همان پارامترهای `GetCustomerListQuery`. */
export const useCustomerFilterStore = createPartyFilterStore("fullName");
