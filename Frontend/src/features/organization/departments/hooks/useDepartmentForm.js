// src/features/organization/departments/hooks/useDepartmentForm.js
import { useForm } from "react-hook-form";
import { requiredMessage } from "@/shared/utils/validationRules";

export const departmentNameRules = {
  required: requiredMessage("نام واحد"),
  validate: (value) =>
    (value ?? "").trim().length >= 2 || "نام واحد حداقل ۲ کاراکتر است",
};

function buildDefaultValues(department) {
  return {
    name: department?.name ?? "",
    headId: department?.headId ?? null,
    deputyId: department?.deputyId ?? null,
  };
}

/**
 * `deputyId` عمداً در payload نیست — بکند ستونش را ندارد و فرستادنِ فیلدِ
 * ناشناخته یعنی سرور بی‌صدا دورش می‌ریزد. وقتی ستون اضافه شد، فقط همین
 * یک خط باز می‌شود (و `OrgLeadershipForm` از حالت disabled درمی‌آید).
 */
export function buildDepartmentPayload(data, id, headName) {
  return {
    ...(id != null ? { id: Number(id) } : {}),
    name: data.name.trim(),
    headId: data.headId ?? null,
    headName,
  };
}

export function useDepartmentForm(initialData = null) {
  const isEditing = Boolean(initialData);

  const formMethods = useForm({
    defaultValues: buildDefaultValues(initialData),
  });

  return {
    formMethods,
    isEditing,
    buildPayload: (data, headName) =>
      buildDepartmentPayload(data, isEditing ? initialData.id : null, headName),
  };
}
