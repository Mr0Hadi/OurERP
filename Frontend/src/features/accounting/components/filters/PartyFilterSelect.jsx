import EntitySelect from "@/shared/components/filters/EntitySelect";
import { useCustomersOptionsQuery } from "@/features/customers/services/queries";
import { useSuppliersOptionsQuery } from "@/features/suppliers/services/queries";
import { AccountingPartyTypeEnum } from "../../domain/accountingEnums";

const renderPhone = (party) => {
  const phone = party.phoneNumber || party.phone;
  return phone ? <span className="text-xs text-muted-foreground" dir="ltr">{phone}</span> : null;
};

/**
 * انتخابِ یک مشتری یا یک تامین‌کننده، بسته به `partyType`. فقط فهرستِ همان نوع دانلود می‌شود
 * (`enabled`)؛ فهرستِ کاملِ هر دو برای هر صفحه‌ی دفتر بی‌دلیل سنگین بود.
 */
export default function PartyFilterSelect({ partyType, value, onSelect, label }) {
  const isSupplier = Number(partyType) === AccountingPartyTypeEnum.SUPPLIER;
  const customersQuery = useCustomersOptionsQuery({ enabled: !isSupplier });
  const suppliersQuery = useSuppliersOptionsQuery({ enabled: isSupplier });

  return isSupplier ? (
    <EntitySelect
      label={label ?? "تامین‌کننده"}
      placeholder="همه‌ی تامین‌کنندگان"
      emptyText="تامین‌کننده‌ای یافت نشد"
      items={suppliersQuery.suppliers}
      value={value}
      onSelect={onSelect}
      isLoading={suppliersQuery.isLoading}
      renderMeta={renderPhone}
    />
  ) : (
    <EntitySelect
      label={label ?? "مشتری"}
      placeholder="همه‌ی مشتریان"
      emptyText="مشتری‌ای یافت نشد"
      items={customersQuery.customers}
      value={value}
      onSelect={onSelect}
      isLoading={customersQuery.isLoading}
      renderMeta={renderPhone}
    />
  );
}
