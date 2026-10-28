import FilterMultiChoice from "@/shared/components/filters/FilterMultiChoice";
import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import { optionsFromLabels } from "@/shared/lib/options";
import { SALE_STATUS_LABELS } from "@/shared/domain/enums/saleStatus";
import { TAX_CATEGORY_LABELS } from "@/shared/domain/enums/taxCategory";
import CategorySelect from "@/features/warehouse/categories/components/CategorySelect";
import { useSaleLineFilterStore } from "../../store/accountingFilterStores";
import PartySelect from "@/features/partyAccount/components/PartySelect";

const STATUS_OPTIONS = optionsFromLabels(SALE_STATUS_LABELS);
const TAX_OPTIONS = optionsFromLabels(TAX_CATEGORY_LABELS);

/** فیلترهای ریزِ اقلامِ فروش (`GetSaleLineJournal`). */
export default function SaleLineFilters() {
  const state = useSaleLineFilterStore();

  return (
    <FilterPanel
      onReset={state.resetFilters}
      dateRowClassName="grid grid-cols-1 gap-4 border-t border-border pt-3 sm:grid-cols-2 lg:grid-cols-5"
      dateRow={
        <div className="sm:col-span-2 lg:col-span-4">
          <FilterMultiChoice
            label="وضعیتِ فروش"
            options={STATUS_OPTIONS}
            value={state.statuses}
            onChange={state.setStatuses}
            emptyHint="همه‌ی صادرشده‌ها (بدونِ پیش‌فاکتور و لغوشده)"
          />
        </div>
      }
      store={useSaleLineFilterStore}
      primary={
        <FilterSearchInput
          placeholder="فاکتور، مشتری، نام یا کدِ کالا..."
          value={state.search}
          onChange={(event) => state.setSearch(event.target.value)}
        />
      }
    >
      <PartySelect
        side="customer"
        value={state.customerId}
        onSelect={state.setCustomerId}
      />
      <CategorySelect value={state.productCategoryId} onSelect={state.setProductCategoryId} />
      <FilterSelect label="مالیات" value={state.taxCategory} onChange={state.setTaxCategory} options={TAX_OPTIONS} numeric />
    </FilterPanel>
  );
}
