import { useCallback } from "react";
import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterDateInput from "@/shared/components/filters/FilterDateInput";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import EntitySelect from "@/shared/components/filters/EntitySelect";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useShippingFilterStore } from "../../store/shippingFilterStore";
import { SHIPPING_STATUS_OPTIONS } from "../../domain/shippingVocabulary";
import { parseQueueFilter } from "../../../shared/queueFilters";

const renderCustomerPhone = (customer) =>
  customer.phoneNumber ? (
    <span className="text-xs text-muted-foreground">{customer.phoneNumber}</span>
  ) : null;

/**
 * وضعیت گزینه‌ی «همه» ندارد — دقیقاً به همان دلیلی که صف دریافت ندارد.
 */
const ShippingFilters = ({ customers = [], isCustomersLoading = false }) => {
  const {
    invoiceNumber,
    customerId,
    status,
    fromDate,
    toDate,
    setInvoiceNumber,
    setCustomerId,
    setStatus,
    setFromDate,
    setToDate,
    resetFilters,
  } = useShippingFilterStore();

  const handleGlobalSearch = useCallback(
    (e) => setInvoiceNumber(e.target.value),
    [setInvoiceNumber],
  );

  return (
    <FilterPanel
      onReset={resetFilters}
      firstRowClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      dateRowClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-border"
      resetWrapperClassName="flex items-end sm:col-span-2 lg:col-span-2 lg:justify-end"
      resetButtonClassName="w-full lg:w-auto px-4"
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
        placeholder="شماره فاکتور فروش..."
        value={invoiceNumber}
        onChange={handleGlobalSearch}
      />

      <EntitySelect
        label="مشتری"
        placeholder="انتخاب مشتری..."
        emptyText="مشتری‌ای یافت نشد"
        items={customers}
        value={customerId}
        onSelect={setCustomerId}
        isLoading={isCustomersLoading}
        renderMeta={renderCustomerPhone}
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <Label className="whitespace-nowrap font-medium text-foreground text-sm">
          وضعیت
        </Label>
        <Select
          value={String(status)}
          onValueChange={(v) => setStatus(parseQueueFilter(v))}
        >
          <SelectTrigger className="flex-1 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SHIPPING_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={String(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </FilterPanel>
  );
};

export default ShippingFilters;
