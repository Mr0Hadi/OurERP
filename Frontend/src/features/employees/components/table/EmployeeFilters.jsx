import { useCallback, useMemo } from "react";

import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import { toFilterOptions } from "@/shared/components/filters/filterUtils";
import { ACCOUNT_STATUS_LABELS } from "@/shared/domain/enums/accountStatus";
import { useDepartmentOptionsQuery } from "@/features/organization/departments/services/queries";
import { useTeamOptionsQuery } from "@/features/organization/teams/services/queries";

import { useEmployeeFilterStore } from "../../store/employeeFilterStore";

const STATUS_OPTIONS = toFilterOptions(ACCOUNT_STATUS_LABELS);

const EmployeeFilters = () => {
  const {
    globalSearch,
    personelCode,
    departmentId,
    teamId,
    status,
    setGlobalSearch,
    setPersonelCode,
    setDepartmentId,
    setTeamId,
    setStatus,
    resetFilters,
  } = useEmployeeFilterStore();

  const { departments } = useDepartmentOptionsQuery();
  // فهرست تیم‌ها تابعِ واحدِ انتخاب‌شده است؛ بدون واحد، همه‌ی تیم‌ها
  // می‌آیند تا بشود مستقیم روی یک تیم فیلتر کرد.
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

  // فقط رقم — سرور `personelCode` را عددی می‌خواهد؛ غیرِ آن بایند نمی‌شود و فیلتر بی‌صدا نادیده گرفته می‌شود.
  const handlePersonelCode = useCallback(
    (e) => setPersonelCode(e.target.value.replace(/[^0-9]/g, "")),
    [setPersonelCode],
  );

  // عوض‌شدن واحد، تیمِ انتخاب‌شده را بی‌معنا می‌کند: تیمی که زیر واحد
  // جدید نیست، نتیجه‌ی همیشه‌خالی می‌دهد و کاربر فکر می‌کند کارمندی وجود
  // ندارد.
  const handleDepartmentChange = useCallback(
    (value) => {
      setDepartmentId(value);
      setTeamId("");
    },
    [setDepartmentId, setTeamId],
  );

  return (
    <FilterPanel
      onReset={resetFilters}
      firstRowClassName="grid grid-cols-1 sm:grid-cols-2 gap-4"
      dateRowClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-border"
      resetWrapperClassName="flex items-end sm:justify-end"
      resetButtonClassName="w-full sm:w-auto px-4"
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
            allLabel="همه تیم‌ها"
            options={teamOptions}
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
        </>
      }
    >
      <FilterSearchInput
        label="جستجو"
        placeholder="نام کارمند..."
        value={globalSearch}
        onChange={handleGlobalSearch}
      />

      <FilterSearchInput
        label="کد پرسنلی"
        placeholder="مثال: 42"
        value={personelCode}
        onChange={handlePersonelCode}
        inputMode="numeric"
      />
    </FilterPanel>
  );
};

export default EmployeeFilters;
