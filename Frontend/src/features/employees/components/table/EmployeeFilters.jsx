// src/features/employees/components/table/EmployeeFilters.jsx
import { useCallback } from "react";

import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import { USER_ROLE_OPTIONS } from "@/shared/domain/enums/userRole";

import { useEmployeeFilterStore } from "../../store/employeeFilterStore";

const STATUS_OPTIONS = [
  { value: "1", label: "فعال" },
  { value: "0", label: "غیرفعال" },
];

const EmployeeFilters = () => {
  const {
    globalSearch,
    roleId,
    isActive,
    setGlobalSearch,
    setRoleId,
    setIsActive,
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
        value={isActive}
        onChange={setIsActive}
        allLabel="همه"
        options={STATUS_OPTIONS}
      />
    </FilterPanel>
  );
};

export default EmployeeFilters;
