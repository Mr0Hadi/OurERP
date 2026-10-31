import { useCallback } from "react";
import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import FilterDateInput from "@/shared/components/filters/FilterDateInput";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import { optionsFromLabels } from "@/shared/lib/options";
import { useSaleFilterStore } from "../../store/saleFilterStore";
import { SALE_STATUS_LABELS } from "@/shared/domain/enums/saleStatus";
import { SALE_PAYMENT_TYPE_LABELS } from "@/shared/domain/enums/paymentType";
import { SALE_PROFORMA_STAGE_LABELS } from "@/shared/domain/enums/saleProforma";
import PartySelect from "@/features/partyAccount/components/PartySelect";

const STATUS_OPTIONS = optionsFromLabels(SALE_STATUS_LABELS);
const STAGE_OPTIONS = optionsFromLabels(SALE_PROFORMA_STAGE_LABELS);
const PAYMENT_TYPE_OPTIONS = optionsFromLabels(SALE_PAYMENT_TYPE_LABELS);

const SaleFilters = () => {
  const {
    invoiceNumber,
    customerId,
    status,
    proformaStages,
    paymentType,
    fromDate,
    toDate,
    setInvoiceNumber,
    setCustomerId,
    setStatus,
    setProformaStages,
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
      store={useSaleFilterStore}
      primary={
        <FilterSearchInput
          placeholder="شماره فاکتور، توضیحات..."
          value={invoiceNumber}
          onChange={handleGlobalSearch}
        />
      }
    >
      <PartySelect side="customer" value={customerId} onSelect={setCustomerId} />

      <FilterSelect
        label="وضعیت"
        value={status}
        onChange={setStatus}
        allLabel="همه وضعیت‌ها"
        options={STATUS_OPTIONS}
        numeric
      />

      <FilterSelect
        label="مرحله‌ی پیش‌فاکتور"
        value={proformaStages}
        onChange={setProformaStages}
        allLabel="همه"
        options={STAGE_OPTIONS}
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
