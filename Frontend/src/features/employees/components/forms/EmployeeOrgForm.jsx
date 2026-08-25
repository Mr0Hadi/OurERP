// src/features/employees/components/forms/EmployeeOrgForm.jsx
import { useMemo } from "react";
import { Network, Info } from "lucide-react";

import FormSectionCard from "@/shared/components/forms/FormSectionCard";
import FormSelectField from "@/shared/components/forms/FormSelectField";
import { requiredMessage } from "@/shared/utils/validationRules";
import { useDepartmentOptionsQuery } from "@/features/organization/departments/services/queries";
import { useTeamOptionsQuery } from "@/features/organization/teams/services/queries";

const departmentRules = {
  validate: (value) =>
    (value != null && value !== "") || requiredMessage("واحد سازمانی"),
};

/**
 * جایگاه سازمانی کارمند — واحد و تیم.
 *
 * انتخابگرها زنجیره‌ای‌اند: تا واحد انتخاب نشود تیم غیرفعال است، و
 * فهرست تیم‌ها فقط تیم‌های همان واحد را دارد. `Team.DepartmentId` در
 * بکند غیرقابل‌null است، پس ترکیب «تیمِ واحد الف برای کارمندِ واحد ب»
 * اصلاً معنا ندارد و نباید قابل انتخاب باشد.
 *
 * ⚠️ `CreateUser`/`UpdateUser` در بکند این دو فیلد را هنوز نمی‌گیرند
 * (سند `docs/org-structure-contract.fa.md`) — ولی چون ستون‌های
 * `User.DepartmentId`/`TeamId` غیرقابل‌null هستند، بدون این‌ها رکورد
 * اصلاً معتبر نیست. پس فرم آن‌ها را می‌گیرد و در payload می‌گذارد.
 */
export default function EmployeeOrgForm({ control, errors, departmentId }) {
  const {
    departments,
    isLoading: isDepartmentsLoading,
    isFallback,
  } = useDepartmentOptionsQuery();

  const { teams, isLoading: isTeamsLoading } = useTeamOptionsQuery(departmentId);

  const departmentOptions = useMemo(
    () => departments.map((d) => ({ value: d.id, label: d.name })),
    [departments],
  );

  const teamOptions = useMemo(
    () => teams.map((t) => ({ value: t.id, label: t.name })),
    [teams],
  );

  const hasDepartment = departmentId != null && departmentId !== "";

  return (
    <FormSectionCard icon={Network} title="جایگاه سازمانی">
      <div className="space-y-4">
        <FormSelectField
          name="departmentId"
          control={control}
          label="واحد سازمانی"
          required
          options={departmentOptions}
          isLoading={isDepartmentsLoading}
          placeholder="انتخاب واحد"
          error={errors.departmentId}
          rules={departmentRules}
        />

        <FormSelectField
          name="teamId"
          control={control}
          label="تیم"
          options={teamOptions}
          isLoading={hasDepartment && isTeamsLoading}
          disabled={!hasDepartment}
          placeholder={
            hasDepartment ? "انتخاب تیم" : "اول واحد سازمانی را انتخاب کنید"
          }
          // تا وقتی واحدی انتخاب نشده، گزینه‌ی «بدون تیم» نمایش داده
          // نمی‌شود: با وجودش، Select همان را نشان می‌داد و placeholderِ
          // راهنما ("اول واحد را انتخاب کنید") هیچ‌وقت دیده نمی‌شد.
          emptyLabel={hasDepartment ? "بدون تیم" : undefined}
          emptyValue={null}
          hint={
            hasDepartment && teamOptions.length === 0 && !isTeamsLoading
              ? "این واحد هنوز تیمی ندارد."
              : undefined
          }
        />

        {isFallback && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/60 dark:bg-amber-950/30">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
            <p className="text-xs leading-5 text-amber-800 dark:text-amber-300">
              فهرست واحدها هنوز از سرور نیامده و مقادیر پیش‌فرض نمایش داده
              می‌شود. تا سید شدن جدول <code>Department</code> در بکند، شناسه‌ها
              ممکن است با سرور یکی نباشند.
            </p>
          </div>
        )}
      </div>
    </FormSectionCard>
  );
}
