import { useMemo } from "react";

import FilterSelect from "@/shared/components/filters/FilterSelect";
import { useDepartmentOptionsQuery } from "@/features/organization/departments/services/queries";
import { useTeamOptionsQuery } from "@/features/organization/teams/services/queries";

/**
 * محدود کردنِ رتبه‌بندیِ کارمندان به یک واحد یا تیم (`departmentId`/`teamId`
 * روی دو گزارشِ کارمندان). عضویتِ **امروز** ملاک است: کسی که تیم عوض کرده
 * سابقه‌اش را با خودش می‌برد.
 *
 * فهرستِ تیم‌ها تابعِ واحدِ انتخاب‌شده است و عوض‌شدنِ واحد تیم را پاک می‌کند
 * — تیمی که زیرِ واحدِ تازه نیست همیشه نتیجه‌ی خالی می‌داد.
 */
export default function EmployeeScopeFilter({ useFilterStore }) {
  const { departmentId, teamId, setDepartmentId, setTeamId } = useFilterStore();
  const { departments } = useDepartmentOptionsQuery();
  const { teams } = useTeamOptionsQuery(departmentId);

  const departmentOptions = useMemo(
    () => departments.map((d) => ({ value: d.id, label: d.name })),
    [departments],
  );
  const teamOptions = useMemo(() => teams.map((t) => ({ value: t.id, label: t.name })), [teams]);

  return (
    <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-card p-3 sm:grid-cols-2">
      <FilterSelect
        label="واحد"
        value={departmentId}
        onChange={(value) => {
          setDepartmentId(value);
          setTeamId("");
        }}
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
    </div>
  );
}
