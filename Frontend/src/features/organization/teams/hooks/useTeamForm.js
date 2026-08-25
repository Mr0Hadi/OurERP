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

/** مثل واحد، `deputyId` تا آماده‌شدن بکند ارسال نمی‌شود. */
export function buildTeamPayload(data, id, headName) {
  return {
    ...(id != null ? { id: Number(id) } : {}),
    name: data.name.trim(),
    departmentId: Number(data.departmentId),
    headId: data.headId ?? null,
    headName,
  };
}

export function useTeamForm(initialData = null) {
  const isEditing = Boolean(initialData);

  const formMethods = useForm({
    defaultValues: buildDefaultValues(initialData),
  });

  return {
    formMethods,
    isEditing,
    buildPayload: (data, headName) =>
      buildTeamPayload(data, isEditing ? initialData.id : null, headName),
  };
}
