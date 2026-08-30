// src/features/warehouse/units/components/UnitFilters.jsx
import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import FilterSelect from "@/shared/components/filters/FilterSelect";

import { UNIT_STATUSES, UNIT_STATUS_LABELS } from "../services/mockData";

const STATUS_OPTIONS = Object.values(UNIT_STATUSES).map((value) => ({
  value,
  label: UNIT_STATUS_LABELS[value],
}));

export default function UnitFilters({
  globalSearch,
  status,
  onSearchChange,
  onStatusChange,
  onReset,
}) {
  return (
    <FilterPanel
      onReset={onReset}
      firstRowClassName="grid grid-cols-1 sm:grid-cols-2 gap-4"
      dateRowClassName="flex justify-end pt-3 border-t border-border"
      resetWrapperClassName="flex items-end"
      resetButtonClassName="px-4"
    >
      <FilterSearchInput
        placeholder="بارکد واحد یا نام کالا..."
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
    </FilterPanel>
  );
}
