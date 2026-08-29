// src/features/employees/hooks/useEmployeeForm.js
import { useForm } from "react-hook-form";
import { requiredMessage } from "@/shared/utils/validationRules";

/**
 * فرمِ کارمند در دو حالت «ثبت» و «ویرایش» یک شکل دارد ولی دو payload
 * متفاوت می‌سازد، چون سرور دو قرارداد متفاوت دارد:
 *
 *   ثبت    → رمز عبور می‌گیرد، `isActive` نمی‌گیرد (همیشه فعال)
 *   ویرایش → `isActive` می‌گیرد، ولی رمز عبور را *نمی‌پذیرد*
 *
 * دو چیز عمداً در این فرم **نیستند**:
 *
 *   `roleId`       — کارمند نقش ندارد؛ سرپرستی روی `Department.HeadId` و
 *                    `Team.HeadId` ذخیره می‌شود و در صفحه‌ی همان واحد یا
 *                    تیم تعیین می‌شود.
 *   `personelCode` — سرور باید بسازدش تا یکتا و پیوسته بماند؛ در حالت
 *                    ویرایش فقط برای *نمایش* از خودِ `employee` خوانده
 *                    می‌شود، نه از فرم.
 */

/** واحد اجباری است — هم در UI و هم در اعتبارسنجیِ خودِ سرور. */
export const departmentRules = {
  validate: (value) =>
    (value != null && value !== "") || requiredMessage("واحد سازمانی"),
};

function buildDefaultValues(employee) {
  if (!employee) {
    return {
      firstName: "",
      lastName: "",
      username: "",
      password: "",
      rePassword: "",
      departmentId: null,
      teamId: null,
      isActive: true,
    };
  }

  return {
    firstName: employee.firstName || "",
    lastName: employee.lastName || "",
    username: employee.username || "",
    password: "",
    rePassword: "",
    departmentId: employee.departmentId ?? null,
    teamId: employee.teamId ?? null,
    isActive: employee.isActive ?? true,
  };
}

/** شناسه‌ی عددی یا null — Select برای «بدون تیم» null می‌دهد. */
const toId = (value) => (value === "" || value == null ? null : Number(value));

/** payload دستور `CreateUser`. */
export function buildCreatePayload(data) {
  return {
    // غلط املاییِ `fisrtName` عمدی است — قرارداد فعلی سرور همین است.
    fisrtName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    username: data.username.trim(),
    password: data.password,
    departmentId: toId(data.departmentId),
    teamId: toId(data.teamId),
  };
}

/** payload دستور `UpdateUser` — کل رکورد، نه فقط فیلدهای تغییرکرده. */
export function buildUpdatePayload(data, id) {
  return {
    id: Number(id),
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    username: data.username.trim(),
    departmentId: toId(data.departmentId),
    teamId: toId(data.teamId),
    isActive: Boolean(data.isActive),
  };
}

/**
 * @param initialData رکوردِ کارمند در حالت ویرایش (یا null در حالت ثبت)
 * @param draftValues پیش‌نویسِ بازگشتی از صفحه‌ی «واحد/تیم جدید»؛ روی
 *        مقادیر پیش‌فرض می‌نشیند و حالتِ فرم (ثبت/ویرایش) را عوض نمی‌کند
 */
export function useEmployeeForm(initialData = null, draftValues = null) {
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
      isEditing
        ? buildUpdatePayload(data, initialData.id)
        : buildCreatePayload(data),
  };
}
