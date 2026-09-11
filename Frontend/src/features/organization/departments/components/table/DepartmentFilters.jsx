import { useCallback } from "react";

import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import { useDepartmentFilterStore } from "../../store/departmentFilterStore";

/**
 * دو کادرِ جدا چون سرور دو فیلترِ مستقل (`name` و `headName`) دارد و آن‌ها
 * را AND می‌کند؛ یک کادرِ «نام واحد یا مدیر» نمی‌تواند هر دو را درست پر کند.
 */
const DepartmentFilters = () => {
  const { globalSearch, headName, setGlobalSearch, setHeadName, resetFilters } =
    useDepartmentFilterStore();

  const handleSearch = useCallback(
    (e) => setGlobalSearch(e.target.value),
    [setGlobalSearch],
  );

  const handleHeadName = useCallback(
    (e) => setHeadName(e.target.value),
    [setHeadName],
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
        label="نام واحد"
        placeholder="نام واحد..."
        value={globalSearch}
        onChange={handleSearch}
      />

      <FilterSearchInput
        label="مدیر واحد"
        placeholder="نام مدیر..."
        value={headName}
        onChange={handleHeadName}
      />
    </FilterPanel>
  );
};

export default DepartmentFilters;
