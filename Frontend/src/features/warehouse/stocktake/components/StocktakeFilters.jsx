import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterDateInput from "@/shared/components/filters/FilterDateInput";
import FilterMultiSelect from "@/shared/components/filters/FilterMultiSelect";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import { STOCKTAKE_STATUS_LABELS } from "@/shared/domain/enums/stocktake";
import { optionsFromLabels } from "@/shared/lib/options";
import { useStocktakeFilterStore } from "../store/stocktakeFilterStore";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import { useWarehousesQuery } from "@/features/warehouse/warehouses/services/queries";

const STATUS_OPTIONS = optionsFromLabels(STOCKTAKE_STATUS_LABELS, { numeric: true });

/** فیلترهای فهرستِ انبارگردانی: جست‌وجوی شماره/عنوان، وضعیت (چندتایی)، بازه‌ی تاریخِ ساخت. */
export default function StocktakeFilters() {
  const store = useStocktakeFilterStore();
  // فیلترِ انبار با بیش از یک انبار؛ مستقل از سوییچ، چون انبارگردانی‌های دورانِ روشن می‌مانند.
  const { data: warehouses = [] } = useWarehousesQuery({ includeInactive: true });

  return (
    <FilterPanel
      store={useStocktakeFilterStore}
      onReset={store.resetFilters}
      firstRowClassName="grid grid-cols-1 sm:grid-cols-2 gap-4"
      primary={
        <FilterSearchInput
          placeholder="شماره یا عنوان..."
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
      <FilterMultiSelect
        label="وضعیت"
        options={STATUS_OPTIONS}
        value={store.statuses}
        onChange={store.setStatuses}
        allLabel="همه‌ی وضعیت‌ها"
      />
      {warehouses.length > 1 && (
        <FilterSelect
          label="انبار"
          value={store.warehouseId}
          onChange={store.setWarehouseId}
          options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
          allLabel="همه‌ی انبارها"
          numeric
        />
      )}
    </FilterPanel>
  );
}
