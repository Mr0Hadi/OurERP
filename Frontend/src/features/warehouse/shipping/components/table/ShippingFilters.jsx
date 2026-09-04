import { useCallback } from "react";
import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import FilterDateInput from "@/shared/components/filters/FilterDateInput";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import EntitySelect from "@/shared/components/filters/EntitySelect";
import { toFilterOptions } from "@/shared/components/filters/filterUtils";
import { useShippingFilterStore } from "../../store/shippingFilterStore";
import { OUTGOING_TYPE_LABELS } from "../../domain/shippingVocabulary";

const TYPE_OPTIONS = toFilterOptions(OUTGOING_TYPE_LABELS);

// از وقتی عودت مازاد به این صف اضافه شد، طرفِ یک محموله می‌تواند مشتری
// یا تامین‌کننده باشد؛ پس هر گزینه کلید ترکیبی دارد و نوعش هم نشان
// داده می‌شود — همان قراردادی که صف دریافت از اول داشت.
const getPartyKey = (party) => party.key;
const getPartyLabel = (party) => party.name;

const renderPartyType = (party) => (
  <span className="text-[10px] text-muted-foreground">
    {party.type === "customer" ? "مشتری" : "تامین‌کننده"}
  </span>
);

const ShippingFilters = ({ parties = [], isPartiesLoading = false }) => {
  const {
    globalSearch,
    counterpartyId,
    type,
    fromDate,
    toDate,
    setGlobalSearch,
    setCounterpartyId,
    setType,
    setFromDate,
    setToDate,
    resetFilters,
  } = useShippingFilterStore();

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
        placeholder="نام مشتری/تامین‌کننده، شماره فاکتور/مرجوعی..."
        value={globalSearch}
        onChange={handleGlobalSearch}
      />

      <EntitySelect
        label="مشتری / تامین‌کننده"
        placeholder="انتخاب طرف حساب..."
        emptyText="موردی یافت نشد"
        items={parties}
        value={counterpartyId}
        onSelect={setCounterpartyId}
        isLoading={isPartiesLoading}
        getKey={getPartyKey}
        getLabel={getPartyLabel}
        renderMeta={renderPartyType}
      />

      <FilterSelect
        label="نوع"
        value={type}
        onChange={setType}
        allLabel="همه (فروش، جایگزین و عودت)"
        options={TYPE_OPTIONS}
        numeric
      />
    </FilterPanel>
  );
};

export default ShippingFilters;
