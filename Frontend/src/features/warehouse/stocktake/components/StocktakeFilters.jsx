import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterDateInput from "@/shared/components/filters/FilterDateInput";
import FilterMultiChoice from "@/shared/components/filters/FilterMultiChoice";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import { STOCKTAKE_STATUS_LABELS } from "@/shared/domain/enums/stocktake";
import { optionsFromLabels } from "@/shared/lib/options";
import { useStocktakeFilterStore } from "../store/stocktakeFilterStore";

const STATUS_OPTIONS = optionsFromLabels(STOCKTAKE_STATUS_LABELS, { numeric: true });

/** فیلترهای فهرستِ انبارگردانی: وضعیت (چندتایی)، جست‌وجوی شماره/عنوان، بازه‌ی تاریخِ ساخت. */
export default function StocktakeFilters() {
  const store = useStocktakeFilterStore();

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
        store={useStocktakeFilterStore}
        onReset={store.resetFilters}
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
      />
    </div>
  );
}
