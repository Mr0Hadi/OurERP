import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterDateInput from "@/shared/components/filters/FilterDateInput";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import FilterSwitch from "@/shared/components/filters/FilterSwitch";
import { useBankAccountOptionsQuery } from "@/shared/services/bankAccounts/queries";
import { DIRECTION_SHORT_LABELS } from "../domain/partyPayment";
import { usePartyPaymentFilterStore } from "../store/partyPaymentFilterStore";
import { optionsFromLabels } from "@/shared/lib/options";
import PartySelect from "@/features/partyAccount/components/PartySelect";

const DIRECTION_OPTIONS = optionsFromLabels(DIRECTION_SHORT_LABELS);
const UNALLOCATED_OPTIONS = [{ value: "true", label: "فقط قابلِ تخصیص" }];

/** فیلترهای فهرستِ علی‌الحساب‌ها: جست‌وجو، مشتری/تامین‌کننده، جهت، صندوق/حساب، تخصیص‌نیافته، بازه‌ی تاریخ. */
export default function PartyPaymentFilters() {
  const store = usePartyPaymentFilterStore();
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
      <PartySelect side="customer" placeholder="همه مشتریان" value={store.customerId} onSelect={store.setCustomerId} />
      <PartySelect side="supplier" placeholder="همه تامین‌کنندگان" value={store.supplierId} onSelect={store.setSupplierId} />
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
