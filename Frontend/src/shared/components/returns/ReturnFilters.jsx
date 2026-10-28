import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import FilterDateInput from "@/shared/components/filters/FilterDateInput";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import { optionsFromLabels } from "@/shared/lib/options";

/**
 * فیلترهای فهرستِ مرجوعی — مشترکِ خرید و فروش. نام‌ها همان پارامترهای
 * `Get*ReturnListQuery` است (`search`، طرف‌حساب، `status`، `problem`، بازه‌ی تاریخ).
 *
 * @param useFilterStore storeِ فیلترِ همان سمت (`createFilterStore`)
 * @param partyLabel    نامِ طرف («تامین‌کننده»/«مشتری») برای راهنمای جست‌وجو
 * @param partySelect   انتخابگرِ طرف‌حساب (`PartySelect`ِ فیچر، به همین store وصل)؛ shared از
 *                      features import نمی‌کند، پس صفحه آن را می‌سازد
 * @param side          `sideConfig(...)` — برچسبِ وضعیت‌ها
 * @param problemLabels همه‌ی مشکل‌های همان سمت
 */
export default function ReturnFilters({ useFilterStore, partyLabel, partySelect, side, problemLabels }) {
  const filters = useFilterStore();

  return (
    <FilterPanel
      onReset={filters.resetFilters}
      dateRow={
        <>
          <FilterDateInput label="از تاریخ" value={filters.fromDate} onChange={filters.setFromDate} />
          <FilterDateInput label="تا تاریخ" value={filters.toDate} onChange={filters.setToDate} />
        </>
      }
      store={useFilterStore}
      primary={
        <FilterSearchInput
          placeholder={`شماره مرجوعی، فاکتور، ${partyLabel}...`}
          value={filters.search}
          onChange={(e) => filters.setSearch(e.target.value)}
        />
      }
    >
      {partySelect}

      <FilterSelect
        label="وضعیت"
        value={filters.status}
        onChange={filters.setStatus}
        allLabel="همه وضعیت‌ها"
        options={optionsFromLabels(side.statusLabels)}
        numeric
      />

      <FilterSelect
        label="نوع مشکل"
        value={filters.problem}
        onChange={filters.setProblem}
        allLabel="همه مشکل‌ها"
        options={optionsFromLabels(problemLabels)}
        numeric
      />
    </FilterPanel>
  );
}
