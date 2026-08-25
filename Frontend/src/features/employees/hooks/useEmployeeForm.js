// src/features/employees/hooks/useEmployeeForm.js
import { useForm } from "react-hook-form";
import { UserRoleEnum } from "@/shared/domain/enums/userRole";

/**
 * فرمِ کارمند در دو حالت «ثبت» و «ویرایش» یک شکل دارد ولی دو payload
 * متفاوت می‌سازد، چون سرور دو قرارداد متفاوت دارد (سند، بخش ۳):
 *
 *   ثبت    → کد پرسنلی و رمز عبور می‌گیرد، `isActive` نمی‌گیرد (همیشه فعال)
 *   ویرایش → `isActive` می‌گیرد، ولی کد پرسنلی و رمز عبور را *نمی‌پذیرد*
 *
 * برای همین در حالت ویرایش، آن دو فیلد فقط-خواندنی نمایش داده می‌شوند نه
 * حذف؛ کاربر باید ببیند کد پرسنلی چیست، فقط نتواند عوضش کند.
 */
function buildDefaultValues(employee) {
  if (!employee) {
    return {
      firstName: "",
      lastName: "",
      username: "",
      personelCode: "",
      password: "",
      rePassword: "",
      roleId: UserRoleEnum.USER,
      isActive: true,
    };
  }

  return {
    firstName: employee.firstName || "",
    lastName: employee.lastName || "",
    username: employee.username || "",
    personelCode: employee.personelCode || "",
    password: "",
    rePassword: "",
    roleId: employee.roleId ?? UserRoleEnum.USER,
    isActive: employee.isActive ?? true,
  };
}

/** payload دستور `CreateUser`. */
export function buildCreatePayload(data) {
  return {
    // غلط املاییِ `fisrtName` عمدی است — قرارداد فعلی سرور همین است.
    fisrtName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    username: data.username.trim(),
    password: data.password,
    personelCode: data.personelCode.trim(),
    roleId: Number(data.roleId),
  };
}

/** payload دستور `UpdateUser` — کل رکورد، نه فقط فیلدهای تغییرکرده. */
export function buildUpdatePayload(data, id) {
  return {
    id: Number(id),
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    username: data.username.trim(),
    roleId: Number(data.roleId),
    isActive: Boolean(data.isActive),
  };
}

export function useEmployeeForm(initialData = null) {
  const isEditing = Boolean(initialData);

  const formMethods = useForm({
    defaultValues: buildDefaultValues(initialData),
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
