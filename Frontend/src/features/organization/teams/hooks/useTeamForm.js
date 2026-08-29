// src/features/organization/teams/hooks/useTeamForm.js
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
 * `headName` در payload نیست: نام مدیر از خودِ رکوردِ کارمند خوانده
 * می‌شود (هم در mock و هم در سرور)، و فرستادنش یعنی یک کپیِ کهنه که با
 * تغییر نام کارمند اشتباه می‌شود.
 *
 * `deputyId` اما همیشه می‌رود — `UpdateTeamCommand` بی‌قید
 * `team.DeputyId = request.DeputyId` می‌گذارد و نفرستادنش معاون را پاک
 * می‌کند.
 */
export function buildTeamPayload(data, id) {
  return {
    ...(id != null ? { id: Number(id) } : {}),
    name: data.name.trim(),
    departmentId: Number(data.departmentId),
    headId: data.headId ?? null,
    deputyId: data.deputyId ?? null,
  };
}

/**
 * @param initialData رکوردِ تیم در حالت ویرایش (یا null در حالت ثبت)
 * @param draftValues پیش‌نویسِ بازگشتی از صفحه‌ی «واحد جدید»
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
