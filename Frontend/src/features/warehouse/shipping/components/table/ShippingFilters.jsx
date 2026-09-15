import { useCallback } from "react";
import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterDateInput from "@/shared/components/filters/FilterDateInput";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useShippingFilterStore } from "../../store/shippingFilterStore";
import { SHIPPING_STATUS_OPTIONS } from "../../domain/shippingVocabulary";

/**
 * مشتری اینجا کشویی نیست: `GetSaleListQuery` فیلترِ `CustomerId` ندارد و
 * فقط روی *نامِ* مشتری جست‌وجو می‌کند، پس یک ورودیِ متنی همان چیزی است
 * که واقعاً به سرور می‌رود.
 *
 * وضعیت هم گزینه‌ی «همه» ندارد — دقیقاً به همان دلیلی که صف دریافت ندارد.
 */
const ShippingFilters = () => {
  const {
    globalSearch,
    customerName,
    status,
    fromDate,
    toDate,
    setGlobalSearch,
    setCustomerName,
    setStatus,
    setFromDate,
    setToDate,
    resetFilters,
  } = useShippingFilterStore();

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
        placeholder="شماره فاکتور فروش..."
        value={globalSearch}
        onChange={handleGlobalSearch}
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <Label className="whitespace-nowrap font-medium text-foreground text-sm">
          مشتری
        </Label>
        <Input
          placeholder="نام مشتری..."
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="flex-1 w-full input-rtl-placeholder"
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <Label className="whitespace-nowrap font-medium text-foreground text-sm">
          وضعیت
        </Label>
        <Select value={String(status)} onValueChange={(v) => setStatus(Number(v))}>
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
