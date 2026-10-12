import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import FilterSwitch from "@/shared/components/filters/FilterSwitch";
import CategoryFilterSelect from "./CategoryFilterSelect";
import { useInventoryValuationFilterStore } from "../../store/accountingFilterStores";

/** فیلترهای ارزشِ موجودی (`GetInventoryValuation`). */
export default function InventoryValuationFilters() {
  const state = useInventoryValuationFilterStore();
  return (
    <FilterPanel
      onReset={state.resetFilters}
      firstRowClassName="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      dateRowClassName="flex justify-end border-t border-border pt-3"
      resetWrapperClassName="w-full sm:w-auto"
    >
      <FilterSearchInput
        placeholder="نام یا کدِ کالا..."
        value={state.search}
        onChange={(event) => state.setSearch(event.target.value)}
      />
      <CategoryFilterSelect value={state.productCategoryId} onSelect={state.setProductCategoryId} />
      <FilterSwitch label="فقط کالاهای دارای ارزش" checked={state.onlyWithValue} onChange={state.setOnlyWithValue} />
    </FilterPanel>
  );
}
