import { useEffect, useMemo, useRef } from "react";
import { useWatch } from "react-hook-form";
import { Network, Plus } from "lucide-react";

import FormSectionCard from "@/shared/components/forms/FormSectionCard";
import FormSelectField from "@/shared/components/forms/FormSelectField";
import { Button } from "@/shared/components/ui/button";
import { useDepartmentOptionsQuery } from "@/features/organization/departments/services/queries";
import { useTeamOptionsQuery } from "@/features/organization/teams/services/queries";
import {
  ORG_ROLE_LABELS,
  OrgRoleEnum,
  orgRolesFor,
} from "@/shared/domain/enums/orgRole";
import { departmentRules } from "../../hooks/useEmployeeForm";

/**
 * جایگاه سازمانیِ کارمند: واحد (اجباری)، تیم (اختیاری) و — در ویرایش —
 * نقش.
 *
 * تیم *وابسته* به واحد است — فهرست تیم‌ها با `departmentId` فیلتر می‌شود
 * و با عوض‌شدن واحد، تیمِ انتخاب‌شده پاک می‌شود؛ وگرنه سرور با «تیم
 * انتخاب شده متعلق به این واحد نیست» ردش می‌کرد.
 *
 * نقش هم وابسته به تیم است (`orgRolesFor`): با تیم فقط «مسئول/جانشینِ
 * تیم»، بدون تیم فقط «مسئول/جانشینِ واحد» — سرور ترکیبِ دیگر را ۴۰۰
 * می‌دهد. با تغییرِ جایگاه، نقش به «عضو» برمی‌گردد (همان کاری که سرور
 * برای کاربرِ جابه‌جاشده می‌کند)، و اگر جایگاه به حالتِ ذخیره‌شده برگردد،
 * نقشِ ذخیره‌شده هم برمی‌گردد.
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

/** مقدارِ فقط‌خواندنی — هم‌ارتفاع و هم‌ظاهرِ یک فیلدِ غیرفعال. */
const ReadOnlyField = ({ label, value }) => (
  <div className="space-y-2">
    <span className="text-sm font-medium">{label}</span>
    <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground">
      {value ?? "—"}
    </div>
  </div>
);

// `==` عمدی است: «بدون تیم» یک‌جا `null` و جای دیگر `undefined` است.
const samePlacement = (a, b) =>
  a.departmentId == b.departmentId && (a.teamId ?? null) == (b.teamId ?? null);

export default function EmployeeOrgForm({
  control,
  errors,
  setValue,
  onCreateDepartment,
  onCreateTeam,
  /**
   * جایگاهِ سازمانی را فقط ادمین عوض می‌کند، نه خودِ کاربر.
   *
   * این یک ظرافتِ ظاهری نیست: واحد قرار است مبنای سطحِ دسترسی باشد
   * (`User.DepartmentId`)، پس اگر کاربر بتواند واحدِ خودش را عوض کند،
   * دسترسیِ خودش را هم عوض کرده — و `UpdateUser` هنوز چک نمی‌کند که چه
   * کسی درخواست داده. دکمه‌های «ایجاد واحد/تیم» هم به همین دلیل پنهان
   * می‌شوند: ساختنِ واحد کارِ مدیریتِ سازمان است.
   */
  readOnly = false,
  /**
   * `{ departmentId, teamId, role, roleTitle }` ذخیره‌شده — فقط در حالت
   * ویرایش. نبودنش یعنی فرمِ ثبت: `CreateUser` نقش نمی‌گیرد.
   */
  initialPlacement = null,
}) {
  const departmentId = useWatch({ control, name: "departmentId" });
  const teamId = useWatch({ control, name: "teamId" });

  const isEditing = initialPlacement != null;

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

  const roleOptions = useMemo(
    () =>
      orgRolesFor(teamId ?? null).map((role) => ({
        value: role,
        label: ORG_ROLE_LABELS[role],
      })),
    [teamId],
  );

  // فقط *تغییرِ* جایگاه اثر دارد، نه اولین مقداردهی — وگرنه در حالت
  // ویرایش (و در بازگشت از صفحه‌ی «تیم جدید») تیم و نقشِ درست پاک می‌شد.
  // در حالت فقط‌خواندنی اصلاً اجرا نمی‌شود.
  const previousPlacement = useRef({ departmentId, teamId });
  useEffect(() => {
    if (readOnly) return;

    const previous = previousPlacement.current;
    if (samePlacement(previous, { departmentId, teamId })) return;

    const departmentChanged = previous.departmentId != departmentId;
    const nextTeamId = departmentChanged ? null : teamId;
    previousPlacement.current = { departmentId, teamId: nextTeamId };

    if (departmentChanged && teamId != null) setValue("teamId", null);

    if (isEditing) {
      const backHome = samePlacement(initialPlacement, {
        departmentId,
        teamId: nextTeamId,
      });
      setValue(
        "role",
        backHome ? (initialPlacement.role ?? OrgRoleEnum.MEMBER) : OrgRoleEnum.MEMBER,
      );
    }
  }, [departmentId, teamId, setValue, readOnly, isEditing, initialPlacement]);

  const placementChanged =
    isEditing && !samePlacement(initialPlacement, { departmentId, teamId });

  if (readOnly) {
    // نامِ واحد و تیم از همان فهرست‌هایی خوانده می‌شود که انتخابگرها
    // استفاده می‌کنند، نه از یک prop تازه.
    const departmentLabel = departmentOptions.find(
      (option) => option.value == departmentId,
    )?.label;
    const teamLabel = teamOptions.find((option) => option.value == teamId)
      ?.label;

    return (
      <FormSectionCard icon={Network} title="جایگاه سازمانی">
        <div className="flex flex-row flex-wrap gap-5">
          <ReadOnlyField
            label="واحد سازمانی"
            value={departmentsLoading ? "..." : departmentLabel}
          />
          <ReadOnlyField
            label="تیم"
            value={teamsLoading ? "..." : (teamLabel ?? "بدون تیم")}
          />
          {isEditing && (
            <ReadOnlyField
              label="نقش سازمانی"
              value={
                initialPlacement.roleTitle ??
                ORG_ROLE_LABELS[initialPlacement.role]
              }
            />
          )}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          واحد، تیم و نقش شما توسط مدیر سیستم تعیین می‌شود و از این صفحه قابل
          تغییر نیست.
        </p>
      </FormSectionCard>
    );
  }

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
                : isEditing
                  ? "مسئول و جانشینِ واحد عضو هیچ تیمی نیستند؛ برای آن نقش‌ها تیم را خالی بگذارید."
                  : "کارمندِ تازه عضو ساده است؛ نقش را بعد از ثبت تعیین کنید."
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

      {isEditing && (
        <div className="mt-4 max-w-xs">
          <FormSelectField
            name="role"
            control={control}
            label="نقش سازمانی"
            options={roleOptions}
            disabled={departmentId == null}
            placeholder="انتخاب نقش"
            error={errors?.role}
            hint={
              teamId != null
                ? "نقش در همین تیم اعمال می‌شود."
                : "بدون تیم، نقش روی خودِ واحد اعمال می‌شود."
            }
          />
        </div>
      )}

      {placementChanged && initialPlacement.role !== OrgRoleEnum.MEMBER && (
        <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          با تغییر واحد یا تیم، نقشِ فعلیِ این کارمند («
          {initialPlacement.roleTitle ?? ORG_ROLE_LABELS[initialPlacement.role]}
          ») در جای قبلی آزاد می‌شود.
        </p>
      )}
    </FormSectionCard>
  );
}
