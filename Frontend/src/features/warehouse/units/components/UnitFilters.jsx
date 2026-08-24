// src/features/warehouse/units/components/UnitFilters.jsx
import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import FilterSelect from "@/shared/components/filters/FilterSelect";

import { UNIT_STATUSES, UNIT_STATUS_LABELS } from "../services/mockData";

// RETURNED_TO_SUPPLIER برچسب ندارد چون هنوز هیچ‌جا در فرانت تولید
// نمی‌شود (نگاه کنید unitStatus.js) — از فیلتر بیرون می‌ماند.
const STATUS_OPTIONS = Object.values(UNIT_STATUSES)
  .filter((value) => UNIT_STATUS_LABELS[value] != null)
  .map((value) => ({
    value,
    label: UNIT_STATUS_LABELS[value],
  }));

const PRINT_STATE_OPTIONS = [
  { value: "printed", label: "چاپ‌شده" },
  { value: "unprinted", label: "چاپ‌نشده" },
];

export default function UnitFilters({
  globalSearch,
  status,
  printState,
  onSearchChange,
  onStatusChange,
  onPrintStateChange,
  onReset,
}) {
  return (
    <FilterPanel
      onReset={onReset}
      firstRowClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      dateRowClassName="flex justify-end pt-3 border-t border-border"
      resetWrapperClassName="flex items-end"
      resetButtonClassName="px-4"
    >
      <FilterSearchInput
        placeholder="کد واحد یا نام کالا..."
        value={globalSearch}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <FilterSelect
        label="وضعیت"
        value={status}
        onChange={onStatusChange}
        options={STATUS_OPTIONS}
        allLabel="همه"
        numeric
      />
      <FilterSelect
        label="چاپ"
        value={printState}
        onChange={onPrintStateChange}
        options={PRINT_STATE_OPTIONS}
        allLabel="همه"
      />
    </FilterPanel>
  );
}
