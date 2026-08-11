import { useCallback } from "react";
import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import FilterDateInput from "@/shared/components/filters/FilterDateInput";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import EntityMultiSelect from "@/shared/components/filters/EntityMultiSelect";
import { toFilterOptions } from "@/shared/components/filters/filterUtils";
import useShippingFilterStore from "../../store/shippingFilterStore";
import { OUTGOING_TYPE_LABELS } from "../../services/outgoingQueueApi";

const TYPE_OPTIONS = toFilterOptions(OUTGOING_TYPE_LABELS);

const ShippingFilters = ({ customers = [], isCustomersLoading = false }) => {
  const {
    globalSearch,
    customerIds,
    type,
    fromDate,
    toDate,
    setGlobalSearch,
    setCustomerIds,
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
        placeholder="شماره فاکتور/مرجوعی..."
        value={globalSearch}
        onChange={handleGlobalSearch}
      />

      <EntityMultiSelect
        label="مشتری"
        placeholder="انتخاب مشتری..."
        emptyText="مشتری‌ای یافت نشد"
        items={customers}
        value={customerIds}
        onSelect={setCustomerIds}
        isLoading={isCustomersLoading}
      />

      <FilterSelect
        label="نوع"
        value={type}
        onChange={setType}
        allLabel="همه (فروش و جایگزین)"
        options={TYPE_OPTIONS}
      />
    </FilterPanel>
  );
};

export default ShippingFilters;
