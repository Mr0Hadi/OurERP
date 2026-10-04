import PartySection from "@/shared/components/forms/PartySection";
import { partyDisplayName } from "@/features/partyAccount/domain/partyName";
import { useCustomerQuery, useCustomerSearchQuery } from "@/features/customers/services/queries";

const CUSTOMER_PARTY = {
  useSearchQuery: useCustomerSearchQuery,
  useDetailQuery: useCustomerQuery,
  displayName: partyDisplayName,
  placeholder: (id, name) => ({ id, firstName: name }),
  texts: {
    title: "مشتری",
    addNew: "مشتری جدید",
    searchPlaceholder: "جست‌وجوی نام یا نام خانوادگی...",
    empty: "لیست مشتریان خالی است",
    notFound: "مشتری‌ای یافت نشد",
  },
};

/** مشتریِ فروش (`PartySection`). */
export default function SaleCustomerSection(props) {
  return <PartySection party={CUSTOMER_PARTY} {...props} />;
}
