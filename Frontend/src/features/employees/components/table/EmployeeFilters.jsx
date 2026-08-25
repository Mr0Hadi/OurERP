// src/features/employees/components/table/EmployeeFilters.jsx
import { useCallback } from "react";

import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import { toFilterOptions } from "@/shared/components/filters/filterUtils";
import { USER_ROLE_OPTIONS } from "@/shared/domain/enums/userRole";
import { ACCOUNT_STATUS_LABELS } from "@/shared/domain/enums/accountStatus";

import { useEmployeeFilterStore } from "../../store/employeeFilterStore";

const STATUS_OPTIONS = toFilterOptions(ACCOUNT_STATUS_LABELS);

const EmployeeFilters = () => {
  const {
    globalSearch,
    roleId,
    status,
    setGlobalSearch,
    setRoleId,
    setStatus,
    resetFilters,
  } = useEmployeeFilterStore();

  const handleGlobalSearch = useCallback(
    (e) => setGlobalSearch(e.target.value),
    [setGlobalSearch],
  );

  return (
    <FilterPanel
      onReset={resetFilters}
      firstRowClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      dateRowClassName="flex pt-3 border-t border-border"
      resetWrapperClassName="flex items-end lg:justify-end w-full"
      resetButtonClassName="w-full sm:w-auto px-4"
    >
      <FilterSearchInput
        placeholder="نام، نام کاربری یا کد پرسنلی..."
        value={globalSearch}
        onChange={handleGlobalSearch}
      />

      <FilterSelect
        label="نقش"
        value={roleId}
        onChange={setRoleId}
        allLabel="همه نقش‌ها"
        options={USER_ROLE_OPTIONS}
        numeric
      />

      <FilterSelect
        label="وضعیت"
        value={status}
        onChange={setStatus}
        allLabel="همه"
        options={STATUS_OPTIONS}
        numeric
      />
    </FilterPanel>
  );
};

export default EmployeeFilters;
