import { useCallback } from "react";
import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import FilterDateInput from "@/shared/components/filters/FilterDateInput";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import EntityMultiSelect from "@/shared/components/filters/EntityMultiSelect";
import { toFilterOptions } from "@/shared/components/filters/filterUtils";
import { useSalesReturnFilterStore } from "../../store/salesReturnFilterStore";
import {
  SALES_RETURN_STATUS_LABELS,
  RETURN_PROBLEM_LABELS,
  CLAIM_SCOPE_LABELS,
} from "../../domain/returnVocabulary";

const STATUS_OPTIONS = toFilterOptions(SALES_RETURN_STATUS_LABELS);
const PROBLEM_OPTIONS = toFilterOptions(RETURN_PROBLEM_LABELS);
const SCOPE_OPTIONS = toFilterOptions(CLAIM_SCOPE_LABELS);

const SalesReturnFilters = ({ customers = [], isCustomersLoading = false }) => {
  const {
    globalSearch,
    customerIds,
    status,
    problem,
    scope,
    fromDate,
    toDate,
    setGlobalSearch,
    setCustomerIds,
    setStatus,
    setProblem,
    setScope,
    setFromDate,
    setToDate,
    resetFilters,
  } = useSalesReturnFilterStore();

  const handleGlobalSearch = useCallback(
    (e) => setGlobalSearch(e.target.value),
    [setGlobalSearch],
  );

  return (
    <FilterPanel
      onReset={resetFilters}
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
        placeholder="شماره مرجوعی، فاکتور، مشتری..."
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
        label="وضعیت"
        value={status}
        onChange={setStatus}
        allLabel="همه وضعیت‌ها"
        options={STATUS_OPTIONS}
        numeric
      />

      <FilterSelect
        label="نوع مشکل"
        value={problem}
        onChange={setProblem}
        allLabel="همه مشکل‌ها"
        options={PROBLEM_OPTIONS}
        numeric
      />

      <FilterSelect
        label="دامنه"
        value={scope}
        onChange={setScope}
        allLabel="همه"
        options={SCOPE_OPTIONS}
        numeric
      />
    </FilterPanel>
  );
};

export default SalesReturnFilters;
