// src/features/organization/teams/components/table/TeamFilters.jsx
import { useCallback, useMemo } from "react";

import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import { useDepartmentOptionsQuery } from "../../../departments/services/queries";
import { useTeamFilterStore } from "../../store/teamFilterStore";

const TeamFilters = () => {
  const { globalSearch, departmentId, setGlobalSearch, setDepartmentId, resetFilters } =
    useTeamFilterStore();

  const { departments } = useDepartmentOptionsQuery();

  const departmentOptions = useMemo(
    () => departments.map((d) => ({ value: d.id, label: d.name })),
    [departments],
  );

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
        placeholder="نام تیم یا مدیر..."
        value={globalSearch}
        onChange={handleSearch}
      />

      <FilterSelect
        label="واحد"
        value={departmentId}
        onChange={setDepartmentId}
        allLabel="همه واحدها"
        options={departmentOptions}
        numeric
      />
    </FilterPanel>
  );
};

export default TeamFilters;
