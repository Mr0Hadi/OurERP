import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import StatusChoice from "@/shared/components/forms/StatusChoice";
import CategorySelect from "@/features/warehouse/categories/components/CategorySelect";
import {
  DOCUMENT_SIDE_LABELS,
  DocumentSideEnum,
  tradeBreakdownGroupLabels,
} from "../../domain/accountingEnums";
import { useTradeBreakdownFilterStore } from "../../store/accountingFilterStores";
import { optionsFromLabels } from "@/shared/lib/options";
import PartySelect from "@/features/partyAccount/components/PartySelect";

const SIDE_OPTIONS = optionsFromLabels(DOCUMENT_SIDE_LABELS, { numeric: true });

/**
 * کنترل‌های تفکیک: «چه چیزی» (فروش/خرید) و «بر اساسِ چه» (کالا، دسته، طرف‌حساب، کاربر) دو
 * انتخابِ اصلیِ صفحه‌اند و بالای پنل، کنارِ هم، به‌شکلِ دکمه می‌آیند؛ بقیه فیلترِ معمولی‌اند.
 */
export default function TradeBreakdownFilters() {
  const state = useTradeBreakdownFilterStore();
  const groupOptions = Object.entries(tradeBreakdownGroupLabels(state.side)).map(([value, label]) => ({
    value: Number(value),
    label,
  }));
  const partySide = state.side === DocumentSideEnum.PURCHASE ? "supplier" : "customer";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <StatusChoice label="سند" options={SIDE_OPTIONS} value={state.side} onChange={state.setSide} />
        <StatusChoice label="تفکیک بر اساسِ" options={groupOptions} value={state.groupBy} onChange={state.setGroupBy} wrap />
      </div>
      <FilterPanel
        onReset={state.resetFilters}
        firstRowClassName="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        dateRowClassName="flex justify-end border-t border-border pt-3"
        resetWrapperClassName="w-full sm:w-auto"
        store={useTradeBreakdownFilterStore}
        primary={
          <FilterSearchInput
            placeholder="عنوانِ گروه..."
            value={state.search}
            onChange={(event) => state.setSearch(event.target.value)}
          />
        }
      >
        <PartySelect side={partySide} value={state.partyId} onSelect={state.setPartyId} />
        <CategorySelect value={state.productCategoryId} onSelect={state.setProductCategoryId} />
      </FilterPanel>
    </div>
  );
}
