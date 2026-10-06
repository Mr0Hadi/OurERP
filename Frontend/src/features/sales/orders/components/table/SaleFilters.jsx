import { useCallback } from "react";
import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import FilterDateInput from "@/shared/components/filters/FilterDateInput";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import EntitySelect from "@/shared/components/filters/EntitySelect";
import { toFilterOptions } from "@/shared/components/filters/filterUtils";
import { useSaleFilterStore } from "../../store/saleFilterStore";
import { SALE_STATUS_LABELS } from "@/shared/domain/enums/saleStatus";
import { SALE_PAYMENT_TYPE_LABELS } from "@/shared/domain/enums/paymentType";

const STATUS_OPTIONS = toFilterOptions(SALE_STATUS_LABELS);
const PAYMENT_TYPE_OPTIONS = toFilterOptions(SALE_PAYMENT_TYPE_LABELS);

const renderCustomerPhone = (customer) =>
  customer.phoneNumber ? (
    <span className="text-xs text-muted-foreground">{customer.phoneNumber}</span>
  ) : null;

/**
 * props:
 *  - customers: آرایه { id, name } از API
 *  - isCustomersLoading: boolean
 */
const SaleFilters = ({ customers = [], isCustomersLoading = false }) => {
  const {
    invoiceNumber,
    customerId,
    status,
    paymentType,
    fromDate,
    toDate,
    setInvoiceNumber,
    setCustomerId,
    setStatus,
    setPaymentType,
    setFromDate,
    setToDate,
    resetFilters,
  } = useSaleFilterStore();

  const handleGlobalSearch = useCallback(
    (e) => setInvoiceNumber(e.target.value),
    [setInvoiceNumber],
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
        value={invoiceNumber}
        onChange={handleGlobalSearch}
      />

      <EntitySelect
        label="مشتری"
        placeholder="انتخاب مشتری..."
        emptyText="مشتری‌ای یافت نشد"
        items={customers}
        value={customerId}
        onSelect={(id) => setCustomerId(id)}
        isLoading={isCustomersLoading}
        renderMeta={renderCustomerPhone}
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
        label="نوع پرداخت"
        value={paymentType}
        onChange={setPaymentType}
        allLabel="همه"
        options={PAYMENT_TYPE_OPTIONS}
        numeric
      />
    </FilterPanel>
  );
};

export default SaleFilters;
