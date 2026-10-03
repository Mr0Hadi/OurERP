import { useCallback } from "react";
import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import FilterDateInput from "@/shared/components/filters/FilterDateInput";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import EntitySelect from "@/shared/components/filters/EntitySelect";
import { toFilterOptions } from "@/shared/components/filters/filterUtils";
import { usePurchaseFilterStore } from "../../store/purchaseFilterStore";
import { DOCUMENT_PAYMENT_TYPES } from "@/shared/domain/enums/paymentType";
import { usePurchaseStatusLabels, usePaymentTypeLabels } from "@/shared/services/enums/queries";


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
    invoiceNumber,
    supplierId,
    status,
    paymentType,
    fromDate,
    toDate,
    setInvoiceNumber,
    setSupplierId,
    setStatus,
    setPaymentType,
    setFromDate,
    setToDate,
    resetFilters,
  } = usePurchaseFilterStore();

  // برچسب‌ها از enumِ سرور (`GetEnums`)؛ نوع‌های پرداختِ سند همان فهرستِ محلی‌اند.
  const statusLabels = usePurchaseStatusLabels();
  const paymentTypeLabels = usePaymentTypeLabels();
  const statusOptions = toFilterOptions(statusLabels);
  const paymentTypeOptions = toFilterOptions(
    Object.fromEntries(DOCUMENT_PAYMENT_TYPES.map((value) => [value, paymentTypeLabels[value]])),
  );

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
        placeholder="شماره فاکتور..."
        value={invoiceNumber}
        onChange={handleGlobalSearch}
      />

      <EntitySelect
        label="تامین‌کننده"
        placeholder="انتخاب تامین‌کننده..."
        emptyText="تامین‌کننده‌ای یافت نشد"
        items={suppliers}
        value={supplierId}
        onSelect={setSupplierId}
        isLoading={isSuppliersLoading}
        renderMeta={renderSupplierPhone}
      />

      <FilterSelect
        label="وضعیت"
        value={status}
        onChange={setStatus}
        allLabel="همه وضعیت‌ها"
        options={statusOptions}
        numeric
      />

      <FilterSelect
        label="نوع پرداخت"
        value={paymentType}
        onChange={setPaymentType}
        allLabel="همه"
        options={paymentTypeOptions}
        numeric
      />
    </FilterPanel>
  );
};

export default PurchaseFilters;
