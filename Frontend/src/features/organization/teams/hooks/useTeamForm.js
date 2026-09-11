import { useForm } from "react-hook-form";
import { requiredMessage } from "@/shared/utils/validationRules";

export const teamNameRules = {
  required: requiredMessage("نام تیم"),
  validate: (value) =>
    (value ?? "").trim().length >= 2 || "نام تیم حداقل ۲ کاراکتر است",
};

export const teamDepartmentRules = {
  validate: (value) =>
    (value != null && value !== "") || requiredMessage("واحد سازمانی"),
};

function buildDefaultValues(team) {
  return {
    name: team?.name ?? "",
    departmentId: team?.departmentId ?? null,
    headId: team?.headId ?? null,
    deputyId: team?.deputyId ?? null,
  };
}

/**
 * `headName` در payload نیست: نام مسئول از خودِ رکوردِ کارمند خوانده
 * می‌شود، و فرستادنش یعنی یک کپیِ کهنه که با تغییر نام کارمند اشتباه
 * می‌شود.
 *
 * `headId`/`deputyId` وضعیتِ نهاییِ تیم‌اند و همیشه می‌روند — نفرستادنِ
 * `deputyId` یعنی برداشتنِ جانشین.
 *
 * `departmentId` فقط در ثبت می‌رود: `UpdateTeam` آن را نمی‌گیرد و تیم
 * بین واحدها جابه‌جا نمی‌شود.
 */
export function buildTeamPayload(data, id) {
  const leadership = {
    headId: data.headId ?? null,
    deputyId: data.deputyId ?? null,
  };

  if (id != null) {
    return { id: Number(id), name: data.name.trim(), ...leadership };
  }

  return {
    name: data.name.trim(),
    departmentId: Number(data.departmentId),
    ...leadership,
  };
}

/**
 * @param initialData رکوردِ تیم در حالت ویرایش (یا null در حالت ثبت)
 * @param draftValues پیش‌نویسِ بازگشتی از صفحه‌ی دیگر
 */
export function useTeamForm(initialData = null, draftValues = null) {
  const isEditing = Boolean(initialData);

  const formMethods = useForm({
    defaultValues: {
      ...buildDefaultValues(initialData),
      ...(draftValues ?? {}),
    },
  });

  return {
    formMethods,
    isEditing,
    buildPayload: (data) =>
      buildTeamPayload(data, isEditing ? initialData.id : null),
  };
}
