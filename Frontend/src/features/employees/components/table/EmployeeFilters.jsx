import { useCallback, useMemo } from "react";

import FilterPanel from "@/shared/components/filters/FilterPanel";
import FilterSelect from "@/shared/components/filters/FilterSelect";
import FilterSearchInput from "@/shared/components/filters/FilterSearchInput";
import { useDepartmentOptionsQuery } from "@/features/organization/departments/services/queries";
import { useTeamOptionsQuery } from "@/features/organization/teams/services/queries";

import { useEmployeeFilterStore } from "../../store/employeeFilterStore";

/**
 * وضعیتِ حساب در بکند یک بولینِ ساده است (`User.IsActive`)، نه enum؛ پس
 * همین‌جا دو گزینه‌ی بولین ساخته می‌شود و «همه» یعنی فیلتر نشده.
 */
const IS_ACTIVE_OPTIONS = [
  { value: true, label: "فعال" },
  { value: false, label: "غیرفعال" },
];

const EmployeeFilters = () => {
  const {
    fullName,
    personelCode,
    departmentId,
    teamId,
    isActive,
    setFullName,
    setPersonelCode,
    setDepartmentId,
    setTeamId,
    setIsActive,
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

  const handleFullName = useCallback(
    (e) => setFullName(e.target.value),
    [setFullName],
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
            value={isActive}
            onChange={setIsActive}
            allLabel="همه"
            options={IS_ACTIVE_OPTIONS}
            boolean
          />
        </>
      }
    >
      <FilterSearchInput
        label="جستجو"
        placeholder="نام کارمند..."
        value={fullName}
        onChange={handleFullName}
      />

      <FilterSearchInput
        label="کد پرسنلی"
        placeholder="مثال: 1042"
        value={personelCode}
        onChange={handlePersonelCode}
        inputMode="numeric"
      />
    </FilterPanel>
  );
};

export default EmployeeFilters;
