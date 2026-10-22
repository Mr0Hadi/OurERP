import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterDateInput from "@/shared/components/filters/FilterDateInput";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import FilterSwitch from "@/shared/components/filters/FilterSwitch";
import EntitySelect from "@/shared/components/filters/EntitySelect";
import { useBankAccountOptionsQuery } from "@/shared/services/bankAccounts/queries";
import { useCustomersOptionsQuery } from "@/features/customers/services/queries";
import { useSuppliersOptionsQuery } from "@/features/suppliers/services/queries";
import { DIRECTION_SHORT_LABELS } from "../domain/partyPayment";
import { usePartyPaymentFilterStore } from "../store/partyPaymentFilterStore";

const DIRECTION_OPTIONS = Object.entries(DIRECTION_SHORT_LABELS).map(([value, label]) => ({ value, label }));
const UNALLOCATED_OPTIONS = [{ value: "true", label: "فقط قابلِ تخصیص" }];

/** فیلترهای فهرستِ علی‌الحساب‌ها: جست‌وجو، مشتری/تامین‌کننده، جهت، صندوق/حساب، تخصیص‌نیافته، بازه‌ی تاریخ. */
export default function PartyPaymentFilters() {
  const store = usePartyPaymentFilterStore();
  const { customers, isLoading: customersLoading } = useCustomersOptionsQuery();
  const { suppliers, isLoading: suppliersLoading } = useSuppliersOptionsQuery();
  const { data: accounts = [] } = useBankAccountOptionsQuery();

  return (
    <FilterPanel
      store={usePartyPaymentFilterStore}
      onReset={store.resetFilters}
      primary={
        <FilterSearchInput
          placeholder="نام طرف، شماره چک/پیگیری، شرح..."
          value={store.search}
          onChange={(e) => store.setSearch(e.target.value)}
        />
      }
      dateRow={
        <>
          <FilterDateInput label="از تاریخ" value={store.fromDate} onChange={store.setFromDate} />
          <FilterDateInput label="تا تاریخ" value={store.toDate} onChange={store.setToDate} />
        </>
      }
    >
      <EntitySelect
        label="مشتری"
        placeholder="همه مشتریان"
        items={customers}
        value={store.customerId}
        onSelect={(id) => store.setCustomerId(id)}
        isLoading={customersLoading}
      />
      <EntitySelect
        label="تامین‌کننده"
        placeholder="همه تامین‌کنندگان"
        items={suppliers}
        value={store.supplierId}
        onSelect={(id) => store.setSupplierId(id)}
        isLoading={suppliersLoading}
      />
      <FilterSelect label="جهت" value={store.direction} onChange={store.setDirection} options={DIRECTION_OPTIONS} numeric />
      <FilterSelect
        label="صندوق/حساب"
        value={store.bankAccountId}
        onChange={store.setBankAccountId}
        options={accounts.map((a) => ({ value: a.id, label: a.title }))}
        numeric
      />
      <FilterSelect
        label="تخصیص"
        value={store.hasUnallocated}
        onChange={store.setHasUnallocated}
        options={UNALLOCATED_OPTIONS}
        boolean
      />
      <FilterSwitch label="نمایشِ ابطال‌شده‌ها" checked={store.includeVoided} onChange={store.setIncludeVoided} />
    </FilterPanel>
  );
}
