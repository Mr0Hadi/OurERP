import { useCallback } from "react";
import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import FilterDateInput from "@/shared/components/filters/FilterDateInput";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import { optionsFromLabels } from "@/shared/lib/options";
import { usePurchaseFilterStore } from "../../store/purchaseFilterStore";
import { PURCHASE_STATUS_LABELS } from "@/shared/domain/enums/purchaseStatus";
import { DOCUMENT_PAYMENT_TYPE_LABELS } from "@/shared/domain/enums/paymentType";
import PartySelect from "@/features/partyAccount/components/PartySelect";

const STATUS_OPTIONS = optionsFromLabels(PURCHASE_STATUS_LABELS);
const PAYMENT_TYPE_OPTIONS = optionsFromLabels(DOCUMENT_PAYMENT_TYPE_LABELS);

const PurchaseFilters = () => {
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
      store={usePurchaseFilterStore}
      primary={
        <FilterSearchInput
          placeholder="شماره فاکتور..."
          value={invoiceNumber}
          onChange={handleGlobalSearch}
        />
      }
    >
      <PartySelect side="supplier" value={supplierId} onSelect={setSupplierId} />

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
