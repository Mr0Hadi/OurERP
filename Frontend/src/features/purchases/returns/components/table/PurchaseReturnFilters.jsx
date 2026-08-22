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
  PURCHASE_RETURN_REASON_LABELS,
} from "../../services/mockData";

const STATUS_OPTIONS = toFilterOptions(PURCHASE_RETURN_STATUS_LABELS);
const REASON_OPTIONS = toFilterOptions(PURCHASE_RETURN_REASON_LABELS);

const PurchaseReturnFilters = ({ suppliers = [], isSuppliersLoading = false }) => {
  const {
    globalSearch,
    supplierIds,
    status,
    reason,
    fromDate,
    toDate,
    setGlobalSearch,
    setSupplierIds,
    setStatus,
    setReason,
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
      firstRowClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
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
        onSelect={setSupplierIds}
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
        label="دلیل"
        value={reason}
        onChange={setReason}
        allLabel="همه دلایل"
        options={REASON_OPTIONS}
      />
    </FilterPanel>
  );
};

export default PurchaseReturnFilters;
