import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterDateInput from "@/shared/components/filters/FilterDateInput";
import FilterMultiChoice from "@/shared/components/filters/FilterMultiChoice";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import FilterSwitch from "@/shared/components/filters/FilterSwitch";
import EntitySelect from "@/shared/components/filters/EntitySelect";
import { CHEQUE_STATUS_LABELS } from "@/shared/domain/enums/chequeStatus";
import { useBankAccountOptionsQuery } from "@/shared/services/bankAccounts/queries";
import { useCustomersOptionsQuery } from "@/features/customers/services/queries";
import { useSuppliersOptionsQuery } from "@/features/suppliers/services/queries";
import { CHEQUE_DIRECTION_LABELS } from "../domain/cheque";
import { useChequeFilterStore } from "../store/chequeFilterStore";

const STATUS_OPTIONS = Object.entries(CHEQUE_STATUS_LABELS).map(([value, label]) => ({ value: Number(value), label }));
const DIRECTION_OPTIONS = Object.entries(CHEQUE_DIRECTION_LABELS).map(([value, label]) => ({ value, label }));

/** فیلترهای فهرستِ چک‌ها: وضعیت (چندتایی)، جهت، طرف، صندوق/حساب، بازه‌ی سررسید، جست‌وجو. */
export default function ChequeFilters() {
  const store = useChequeFilterStore();
  const { customers, isLoading: customersLoading } = useCustomersOptionsQuery();
  const { suppliers, isLoading: suppliersLoading } = useSuppliersOptionsQuery();
  const { data: accounts = [] } = useBankAccountOptionsQuery();

  return (
    <div className="space-y-3">
      <FilterMultiChoice
        label="وضعیت"
        options={STATUS_OPTIONS}
        value={store.statuses}
        onChange={store.setStatuses}
        emptyHint="هیچ‌کدام = همه‌ی وضعیت‌ها"
      />
      <FilterPanel
        store={useChequeFilterStore}
        onReset={store.resetFilters}
        primary={
          <FilterSearchInput
            placeholder="شماره، صاحب حساب، بانک، طرف، فاکتور..."
            value={store.search}
            onChange={(e) => store.setSearch(e.target.value)}
          />
        }
        dateRow={
          <>
            <FilterDateInput label="سررسید از" value={store.fromDueDate} onChange={store.setFromDueDate} />
            <FilterDateInput label="سررسید تا" value={store.toDueDate} onChange={store.setToDueDate} />
          </>
        }
      >
        <FilterSelect label="جهت" value={store.direction} onChange={store.setDirection} options={DIRECTION_OPTIONS} numeric />
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
        <FilterSelect
          label="صندوق/حساب"
          value={store.bankAccountId}
          onChange={store.setBankAccountId}
          options={accounts.map((a) => ({ value: a.id, label: a.title }))}
          numeric
        />
        <FilterSwitch
          label="چک‌های ابطال‌شده"
          hint="چکِ در جریانی که اشتباهی ثبت و ابطال شد"
          checked={store.includeVoided}
          onChange={store.setIncludeVoided}
        />
      </FilterPanel>
    </div>
  );
}
