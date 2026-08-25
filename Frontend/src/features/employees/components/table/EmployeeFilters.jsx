// src/features/employees/components/table/EmployeeFilters.jsx
import { useCallback, useMemo } from "react";

import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import { toFilterOptions } from "@/shared/components/filters/filterUtils";
import { USER_ROLE_OPTIONS } from "@/shared/domain/enums/userRole";
import { ACCOUNT_STATUS_LABELS } from "@/shared/domain/enums/accountStatus";
import { useDepartmentOptionsQuery } from "@/features/organization/departments/services/queries";
import { useTeamOptionsQuery } from "@/features/organization/teams/services/queries";

import { useEmployeeFilterStore } from "../../store/employeeFilterStore";

const STATUS_OPTIONS = toFilterOptions(ACCOUNT_STATUS_LABELS);

const EmployeeFilters = () => {
  const {
    globalSearch,
    roleId,
    status,
    departmentId,
    teamId,
    setGlobalSearch,
    setRoleId,
    setStatus,
    setDepartmentId,
    setTeamId,
    resetFilters,
  } = useEmployeeFilterStore();

  const { departments } = useDepartmentOptionsQuery();
  const { teams } = useTeamOptionsQuery(departmentId);

  const departmentOptions = useMemo(
    () => departments.map((d) => ({ value: d.id, label: d.name })),
    [departments],
  );

  const teamOptions = useMemo(
    () => teams.map((t) => ({ value: t.id, label: t.name })),
    [teams],
  );

  const handleGlobalSearch = useCallback(
    (e) => setGlobalSearch(e.target.value),
    [setGlobalSearch],
  );

  // با عوض‌شدن واحد، تیمِ انتخاب‌شده دیگر به آن واحد تعلق ندارد و نتیجه
  // همیشه خالی می‌شود؛ پس همان‌جا پاک می‌شود.
  const handleDepartmentChange = useCallback(
    (value) => {
      setDepartmentId(value);
      if (teamId !== "") setTeamId("");
    },
    [setDepartmentId, setTeamId, teamId],
  );

  return (
    <FilterPanel
      onReset={resetFilters}
      firstRowClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      dateRowClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-3 border-t border-border"
      resetWrapperClassName="flex items-end lg:justify-end"
      resetButtonClassName="w-full px-4"
      dateRow={
        <>
          <FilterSelect
            label="واحد"
            value={departmentId}
            onChange={handleDepartmentChange}
            allLabel="همه واحدها"
            options={departmentOptions}
            numeric
          />

          <FilterSelect
            label="تیم"
            value={teamId}
            onChange={setTeamId}
            allLabel={departmentId === "" ? "اول واحد را انتخاب کنید" : "همه تیم‌ها"}
            options={teamOptions}
            numeric
          />
        </>
      }
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
