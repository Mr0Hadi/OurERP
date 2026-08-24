import { useCallback } from "react";
import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import FilterDateInput from "@/shared/components/filters/FilterDateInput";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import EntityMultiSelect from "@/shared/components/filters/EntityMultiSelect";
import { toFilterOptions } from "@/shared/components/filters/filterUtils";
import { useReceivingFilterStore } from "../../store/receivingFilterStore";
import { INCOMING_TYPE_LABELS } from "../../domain/receivingVocabulary";

const TYPE_OPTIONS = toFilterOptions(INCOMING_TYPE_LABELS);

// در این صفحه هم خرید (طرف: تامین‌کننده) و هم مرجوعی فروش (طرف: مشتری)
// دیده می‌شود، پس هر گزینه با کلید ترکیبی شناخته و نوعش هم نشان داده می‌شود.
const getPartyKey = (party) => party.key;
const getPartyLabel = (party) => party.name;

const renderPartyType = (party) => (
  <span className="text-[10px] text-muted-foreground">
    {party.type === "customer" ? "مشتری" : "تامین‌کننده"}
  </span>
);

const renderPartyTypeChip = (party) => (
  <span className="text-[10px] opacity-70">
    ({party.type === "customer" ? "مشتری" : "تامین‌کننده"})
  </span>
);

const ReceivingFilters = ({ parties = [], isPartiesLoading = false }) => {
  const {
    globalSearch,
    type,
    counterpartyIds,
    fromDate,
    toDate,
    setGlobalSearch,
    setType,
    setCounterpartyIds,
    setFromDate,
    setToDate,
    resetFilters,
  } = useReceivingFilterStore();

  const handleGlobalSearch = useCallback(
    (e) => setGlobalSearch(e.target.value),
    [setGlobalSearch],
  );

  return (
    <FilterPanel
      onReset={resetFilters}
      firstRowClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      dateRowClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-border"
      resetWrapperClassName="flex items-end sm:col-span-2 lg:col-span-2 lg:justify-end"
      resetButtonClassName="w-full lg:w-auto px-4"
      dateRow={
        <>
          <FilterDateInput
            label="از تاریخ"
            value={fromDate}
            onChange={setFromDate}
          />
          <FilterDateInput
            label="تا تاریخ"
            value={toDate}
            onChange={setToDate}
          />
        </>
      }
    >
      <FilterSearchInput
        placeholder="نام تامین‌کننده/مشتری، شماره فاکتور/مرجوعی..."
        value={globalSearch}
        onChange={handleGlobalSearch}
      />

      <EntityMultiSelect
        label="مشتری / تامین‌کننده"
        placeholder="انتخاب طرف حساب..."
        emptyText="موردی یافت نشد"
        items={parties}
        value={counterpartyIds}
        onSelect={setCounterpartyIds}
        isLoading={isPartiesLoading}
        getKey={getPartyKey}
        getLabel={getPartyLabel}
        renderMeta={renderPartyType}
        renderChipMeta={renderPartyTypeChip}
        showSelectAll={false}
      />

      <FilterSelect
        label="نوع"
        value={type}
        onChange={setType}
        allLabel="همه (خرید و مرجوعی)"
        options={TYPE_OPTIONS}
        numeric
      />
    </FilterPanel>
  );
};

export default ReceivingFilters;
