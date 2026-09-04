import { useCallback } from "react";
import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import FilterDateInput from "@/shared/components/filters/FilterDateInput";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import EntitySelect from "@/shared/components/filters/EntitySelect";
import { toFilterOptions } from "@/shared/components/filters/filterUtils";
import { usePurchaseFilterStore } from "../../store/purchaseFilterStore";
import { PURCHASE_STATUS_LABELS } from "@/shared/domain/enums/purchaseStatus";
import { DOCUMENT_PAYMENT_TYPE_LABELS } from "@/shared/domain/enums/paymentType";

const STATUS_OPTIONS = toFilterOptions(PURCHASE_STATUS_LABELS);
const PAYMENT_TYPE_OPTIONS = toFilterOptions(DOCUMENT_PAYMENT_TYPE_LABELS);

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
    supplierId,
    status,
    paymentType,
    fromDate,
    toDate,
    setGlobalSearch,
    setSupplierId,
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

export default PurchaseFilters;
