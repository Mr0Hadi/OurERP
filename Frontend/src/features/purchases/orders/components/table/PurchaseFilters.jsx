import { useCallback } from "react";
import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import FilterDateInput from "@/shared/components/filters/FilterDateInput";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import EntityMultiSelect from "@/shared/components/filters/EntityMultiSelect";
import { toFilterOptions } from "@/shared/components/filters/filterUtils";
import usePurchaseFilterStore from "../../store/purchaseFilterStore";
import {
  PURCHASE_STATUS_LABELS,
  PAYMENT_TYPE_LABELS,
} from "../../services/mockData";

const STATUS_OPTIONS = toFilterOptions(PURCHASE_STATUS_LABELS);
const PAYMENT_TYPE_OPTIONS = toFilterOptions(PAYMENT_TYPE_LABELS);

const renderSupplierPhone = (supplier) =>
  supplier.phone ? (
    <span className="text-xs text-muted-foreground">{supplier.phone}</span>
  ) : null;

/**
 * props:
 *  - suppliers: آرایه { id, name } از API
 *  - isSuppliersLoading: boolean
 */
const PurchaseFilters = ({ suppliers = [], isSuppliersLoading = false }) => {
  const {
    globalSearch,
    supplierIds,
    status,
    paymentType,
    fromDate,
    toDate,
    setGlobalSearch,
    setSupplierIds,
    setStatus,
    setPaymentType,
    setFromDate,
    setToDate,
    resetFilters,
  } = usePurchaseFilterStore();

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
        placeholder="شماره فاکتور، توضیحات..."
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
        renderMeta={renderSupplierPhone}
      />

      <FilterSelect
        label="وضعیت"
        value={status}
        onChange={setStatus}
        allLabel="همه وضعیت‌ها"
        options={STATUS_OPTIONS}
      />

      <FilterSelect
        label="نوع پرداخت"
        value={paymentType}
        onChange={setPaymentType}
        allLabel="همه"
        options={PAYMENT_TYPE_OPTIONS}
      />
    </FilterPanel>
  );
};

export default PurchaseFilters;
