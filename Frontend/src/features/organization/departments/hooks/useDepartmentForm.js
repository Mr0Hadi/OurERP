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
 * `headName` در payload نیست — نام مدیر مشتقِ `headId` است و فرستادنش
 * فقط یک کپیِ کهنه‌شدنی می‌ساخت.
 *
 * `deputyId` برعکس، **باید** همیشه برود: هندلرِ سرور بی‌قید
 * `department.DeputyId = request.DeputyId` می‌گذارد، پس نفرستادنش یعنی
 * پاک‌شدنِ معاونِ ثبت‌شده در هر ذخیره.
 */
export function buildDepartmentPayload(data, id) {
  return {
    ...(id != null ? { id: Number(id) } : {}),
    name: data.name.trim(),
    headId: data.headId ?? null,
    deputyId: data.deputyId ?? null,
  };
}

/**
 * @param initialData رکوردِ واحد در حالت ویرایش (یا null در حالت ثبت)
 * @param draftValues پیش‌نویسِ بازگشتی از صفحه‌ی «تیم جدید»
 */
export function useDepartmentForm(initialData = null, draftValues = null) {
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
      buildDepartmentPayload(data, isEditing ? initialData.id : null),
  };
}
