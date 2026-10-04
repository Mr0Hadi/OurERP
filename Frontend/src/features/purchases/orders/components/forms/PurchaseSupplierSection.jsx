import PartySection from "@/shared/components/forms/PartySection";
import { partyDisplayName } from "@/features/partyAccount/domain/partyName";
import { useSupplierQuery, useSupplierSearchQuery } from "@/features/suppliers/services/queries";

const SUPPLIER_PARTY = {
  useSearchQuery: useSupplierSearchQuery,
  useDetailQuery: useSupplierQuery,
  displayName: partyDisplayName,
  placeholder: (id, name) => ({ id, companyName: name }),
  texts: {
    title: "تامین‌کننده",
    addNew: "تامین‌کننده‌ی جدید",
    searchPlaceholder: "جست‌وجوی نام شرکت یا مسئول...",
    empty: "لیست تامین‌کنندگان خالی است",
    notFound: "تامین‌کننده‌ای یافت نشد",
  },
};

/** تامین‌کننده‌ی خرید (`PartySection`). */
export default function PurchaseSupplierSection(props) {
  return <PartySection party={SUPPLIER_PARTY} {...props} />;
}
