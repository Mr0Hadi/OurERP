import { useCallback } from "react";
import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import FilterDateInput from "@/shared/components/filters/FilterDateInput";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import EntityMultiSelect from "@/shared/components/filters/EntityMultiSelect";
import { toFilterOptions } from "@/shared/components/filters/filterUtils";
import { useSaleFilterStore } from "../../store/saleFilterStore";
import {
  SALE_STATUS_LABELS,
  PAYMENT_TYPE_LABELS,
} from "../../services/mockData";

const STATUS_OPTIONS = toFilterOptions(SALE_STATUS_LABELS);
const PAYMENT_TYPE_OPTIONS = toFilterOptions(PAYMENT_TYPE_LABELS);

const renderCustomerPhone = (customer) =>
  customer.phone ? (
    <span className="text-xs text-muted-foreground">{customer.phone}</span>
  ) : null;

/**
 * props:
 *  - customers: آرایه { id, name } از API
 *  - isCustomersLoading: boolean
 */
const SaleFilters = ({ customers = [], isCustomersLoading = false }) => {
  const {
    globalSearch,
    customerIds,
    status,
    paymentType,
    fromDate,
    toDate,
    setGlobalSearch,
    setCustomerIds,
    setStatus,
    setPaymentType,
    setFromDate,
    setToDate,
    resetFilters,
  } = useSaleFilterStore();

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
        label="مشتری"
        placeholder="انتخاب مشتری..."
        emptyText="مشتری‌ای یافت نشد"
        items={customers}
        value={customerIds}
        onSelect={setCustomerIds}
        isLoading={isCustomersLoading}
        renderMeta={renderCustomerPhone}
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

export default SaleFilters;
