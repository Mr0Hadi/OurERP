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
import { useReceivingFilterStore } from "../../store/receivingFilterStore";
import { RECEIVING_STATUS_OPTIONS } from "../../domain/receivingVocabulary";

const renderSupplierPhone = (supplier) =>
  supplier.phone ? (
    <span className="text-xs text-muted-foreground">{supplier.phone}</span>
  ) : null;

/**
 * وضعیت اینجا گزینه‌ی «همه» ندارد: `GetPurchaseListQuery` فقط یک مقدار
 * می‌گیرد و بدونِ آن، خریدهای لغوشده و کاملاً دریافت‌شده هم وارد صف
 * می‌شوند — یعنی ردیف‌هایی با دکمه‌ی «دریافت» که هیچ کاری نمی‌کند.
 */
const ReceivingFilters = ({ suppliers = [], isSuppliersLoading = false }) => {
  const {
    globalSearch,
    supplierId,
    status,
    fromDate,
    toDate,
    setGlobalSearch,
    setSupplierId,
    setStatus,
    setFromDate,
    setToDate,
    resetFilters,
  } = useReceivingFilterStore();

  const handleGlobalSearch = useCallback(
    (e) => setGlobalSearch(e.target.value),
    [setGlobalSearch],
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
        placeholder="شماره فاکتور خرید..."
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

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <Label className="whitespace-nowrap font-medium text-foreground text-sm">
          وضعیت
        </Label>
        <Select value={String(status)} onValueChange={(v) => setStatus(Number(v))}>
          <SelectTrigger className="flex-1 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RECEIVING_STATUS_OPTIONS.map((option) => (
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

export default ReceivingFilters;
