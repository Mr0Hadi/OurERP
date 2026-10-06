import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import FilterDateInput from "@/shared/components/filters/FilterDateInput";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import EntitySelect from "@/shared/components/filters/EntitySelect";
import { toFilterOptions } from "@/shared/components/filters/filterUtils";

/**
 * فیلترهای فهرستِ مرجوعی — مشترکِ خرید و فروش. نام‌ها همان پارامترهای
 * `Get*ReturnListQuery` است (`search`، طرف‌حساب، `status`، `problem`، بازه‌ی تاریخ).
 *
 * @param useFilterStore storeِ فیلترِ همان سمت (`createFilterStore`)
 * @param party         `{ key: "supplierId", label, emptyText, items, isLoading }`
 * @param side          `sideConfig(...)` — برچسبِ وضعیت‌ها
 * @param problemLabels همه‌ی مشکل‌های همان سمت
 */
export default function ReturnFilters({ useFilterStore, party, side, problemLabels }) {
  const filters = useFilterStore();
  const setParty = filters[`set${party.key[0].toUpperCase()}${party.key.slice(1)}`];

  return (
    <FilterPanel
      onReset={filters.resetFilters}
      dateRow={
        <>
          <FilterDateInput label="از تاریخ" value={filters.fromDate} onChange={filters.setFromDate} />
          <FilterDateInput label="تا تاریخ" value={filters.toDate} onChange={filters.setToDate} />
        </>
      }
    >
      <FilterSearchInput
        placeholder={`شماره مرجوعی، فاکتور، ${party.label}...`}
        value={filters.search}
        onChange={(e) => filters.setSearch(e.target.value)}
      />

      <EntitySelect
        label={party.label}
        placeholder={`انتخاب ${party.label}...`}
        emptyText={party.emptyText}
        items={party.items}
        value={filters[party.key]}
        onSelect={setParty}
        isLoading={party.isLoading}
      />

      <FilterSelect
        label="وضعیت"
        value={filters.status}
        onChange={filters.setStatus}
        allLabel="همه وضعیت‌ها"
        options={toFilterOptions(side.statusLabels)}
        numeric
      />

      <FilterSelect
        label="نوع مشکل"
        value={filters.problem}
        onChange={filters.setProblem}
        allLabel="همه مشکل‌ها"
        options={toFilterOptions(problemLabels)}
        numeric
      />
    </FilterPanel>
  );
}
