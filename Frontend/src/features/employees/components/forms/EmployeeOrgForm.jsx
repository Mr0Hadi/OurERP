// src/features/employees/components/forms/EmployeeOrgForm.jsx
import { useEffect, useMemo, useRef } from "react";
import { useWatch } from "react-hook-form";
import { Network, Plus } from "lucide-react";

import FormSectionCard from "@/shared/components/forms/FormSectionCard";
import FormSelectField from "@/shared/components/forms/FormSelectField";
import { Button } from "@/shared/components/ui/button";
import { useDepartmentOptionsQuery } from "@/features/organization/departments/services/queries";
import { useTeamOptionsQuery } from "@/features/organization/teams/services/queries";
import { departmentRules } from "../../hooks/useEmployeeForm";

/**
 * جایگاه سازمانیِ کارمند: واحد (اجباری) و تیم (اختیاری).
 *
 * تیم *وابسته* به واحد است — فهرست تیم‌ها با `departmentId` فیلتر می‌شود
 * و با عوض‌شدن واحد، تیمِ انتخاب‌شده پاک می‌شود. بدون این پاک‌سازی
 * می‌شد کارمندی ساخت که تیمش زیر واحد دیگری است؛ چنین رکوردی در بکند
 * بی‌معناست و هیچ اعتبارسنجی‌ای هم جلویش را نمی‌گیرد.
 *
 * دکمه‌های «واحد جدید» و «تیم جدید» کاربر را از وسطِ همین فرم به صفحه‌ی
 * ساخت می‌برند و برمی‌گردانند؛ نگه‌داشتن اطلاعاتِ نیمه‌کاره کارِ صفحه است
 * (`useFormDraft`) و این کامپوننت فقط کلیک را خبر می‌دهد.
 */
/** لینکِ کوچکِ «ایجاد ...» زیر هر انتخابگر. */
const CreateButton = ({ onClick, disabled = false, children }) => (
  <Button
    type="button"
    variant="ghost"
    size="sm"
    onClick={onClick}
    disabled={disabled}
    className="h-auto px-2 py-1 text-xs text-primary hover:text-primary gap-1"
  >
    <Plus className="h-3.5 w-3.5" />
    {children}
  </Button>
);

export default function EmployeeOrgForm({
  control,
  errors,
  setValue,
  onCreateDepartment,
  onCreateTeam,
}) {
  const departmentId = useWatch({ control, name: "departmentId" });

  const { departments, isLoading: departmentsLoading, isFallback } =
    useDepartmentOptionsQuery();
  const { teams, isLoading: teamsLoading } = useTeamOptionsQuery(
    departmentId ?? "",
  );

  const departmentOptions = useMemo(
    () => departments.map((d) => ({ value: d.id, label: d.name })),
    [departments],
  );

  const teamOptions = useMemo(
    () => teams.map((t) => ({ value: t.id, label: t.name })),
    [teams],
  );

  // فقط *تغییرِ* واحد تیم را پاک می‌کند، نه اولین مقداردهی — وگرنه در
  // حالت ویرایش (و در بازگشت از صفحه‌ی «تیم جدید») تیمِ درست پاک می‌شد.
  const previousDepartment = useRef(departmentId);
  useEffect(() => {
    if (previousDepartment.current !== departmentId) {
      previousDepartment.current = departmentId;
      setValue("teamId", null);
    }
  }, [departmentId, setValue]);

  return (
    <FormSectionCard icon={Network} title="جایگاه سازمانی">
      <div className="flex flex-row space-x-5">
        <div className="space-y-1">
          <FormSelectField
            name="departmentId"
            control={control}
            label="واحد سازمانی"
            required
            options={departmentOptions}
            isLoading={departmentsLoading}
            placeholder="انتخاب واحد"
            error={errors?.departmentId}
            rules={departmentRules}
            hint={
              isFallback
                ? "فهرست واحدها هنوز از سرور نیامده؛ مقادیر پیش‌فرض نمایش داده می‌شود."
                : undefined
            }
          />
          <CreateButton onClick={onCreateDepartment}>
            ایجاد واحد جدید
          </CreateButton>
        </div>

        <div className="space-y-1">
          <FormSelectField
            name="teamId"
            control={control}
            label="تیم"
            options={teamOptions}
            isLoading={teamsLoading}
            disabled={departmentId == null}
            placeholder={
              departmentId == null ? "اول واحد را انتخاب کنید" : "انتخاب تیم"
            }
            emptyLabel="بدون تیم"
            emptyValue={null}
            error={errors?.teamId}
            hint={
              departmentId != null && !teamsLoading && teamOptions.length === 0
                ? "این واحد هنوز تیمی ندارد."
                : "هد تیم و هد واحد در صفحه‌ی همان تیم یا واحد تعیین می‌شود."
            }
          />
          <CreateButton
            onClick={onCreateTeam}
            disabled={departmentId == null}
          >
            ایجاد تیم جدید
          </CreateButton>
        </div>
      </div>
    </FormSectionCard>
  );
}
