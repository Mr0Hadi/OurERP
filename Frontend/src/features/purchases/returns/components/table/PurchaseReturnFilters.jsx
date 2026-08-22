import { useCallback } from "react";
import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import FilterDateInput from "@/shared/components/filters/FilterDateInput";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import EntityMultiSelect from "@/shared/components/filters/EntityMultiSelect";
import { toFilterOptions } from "@/shared/components/filters/filterUtils";
import { usePurchaseReturnFilterStore } from "../../store/purchaseReturnFilterStore";
import {
  PURCHASE_RETURN_STATUS_LABELS,
  PURCHASE_RETURN_PROBLEM_LABELS,
  CLAIM_SCOPE_LABELS,
} from "../../domain/purchaseReturnVocabulary";

const STATUS_OPTIONS = toFilterOptions(PURCHASE_RETURN_STATUS_LABELS);
const PROBLEM_OPTIONS = toFilterOptions(PURCHASE_RETURN_PROBLEM_LABELS);
const SCOPE_OPTIONS = toFilterOptions(CLAIM_SCOPE_LABELS);

const PurchaseReturnFilters = ({ suppliers = [], isSuppliersLoading = false }) => {
  const {
    globalSearch,
    supplierIds,
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
  } = usePurchaseReturnFilterStore();

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
        placeholder="شماره مرجوعی، فاکتور، تامین‌کننده..."
        value={globalSearch}
        onChange={handleGlobalSearch}
      />

      <EntityMultiSelect
        label="تامین‌کننده"
        placeholder="انتخاب تامین‌کننده..."
        emptyText="تامین‌کننده‌ای یافت نشد"
        items={suppliers}
        value={supplierIds}
        onSelect={setCustomerIds}
        isLoading={isSuppliersLoading}
      />

      <FilterSelect
        label="وضعیت"
        value={status}
        onChange={setStatus}
        allLabel="همه وضعیت‌ها"
        options={STATUS_OPTIONS}
      />

      <FilterSelect
        label="نوع مشکل"
        value={problem}
        onChange={setProblem}
        allLabel="همه مشکل‌ها"
        options={PROBLEM_OPTIONS}
      />

      <FilterSelect
        label="دامنه"
        value={scope}
        onChange={setScope}
        allLabel="همه"
        options={SCOPE_OPTIONS}
      />
    </FilterPanel>
  );
};

export default PurchaseReturnFilters;
