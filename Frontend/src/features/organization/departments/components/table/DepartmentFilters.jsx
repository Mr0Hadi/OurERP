// src/features/organization/departments/components/table/DepartmentFilters.jsx
import { useCallback } from "react";

import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import { useDepartmentFilterStore } from "../../store/departmentFilterStore";

const DepartmentFilters = () => {
  const { globalSearch, setGlobalSearch, resetFilters } =
    useDepartmentFilterStore();

  const handleSearch = useCallback(
    (e) => setGlobalSearch(e.target.value),
    [setGlobalSearch],
  );

  return (
    <FilterPanel
      onReset={resetFilters}
      firstRowClassName="grid grid-cols-1 lg:grid-cols-2 gap-4"
      dateRowClassName="flex pt-3 border-t border-border"
      resetWrapperClassName="flex items-end lg:justify-end w-full"
      resetButtonClassName="w-full sm:w-auto px-4"
    >
      <FilterSearchInput
        placeholder="نام واحد یا مدیر..."
        value={globalSearch}
        onChange={handleSearch}
      />
    </FilterPanel>
  );
};

export default DepartmentFilters;
