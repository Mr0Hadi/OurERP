// src/features/employees/services/api-v1.js
import axiosInstance from "@/shared/services/api/axios";
import { normalizeListResponse } from "@/shared/services/api/contract";
import { accountStatusToIsActive } from "@/shared/domain/enums/accountStatus";

/**
 * لایه‌ی سرورِ فیچر کارمندان — نگاشت مستقیم روی `api/User` و
 * `api/Account/LogoutUserById` (بخش‌های ۲ و ۳ سند api-guide.fa.md).
 *
 * پوششِ `ResponseDto` را axios باز می‌کند، پس اینجا `data` همان محتوای
 * `Data` است.
 *
 * ⚠️ بکند **هنوز `GetUserList` ندارد**. فهرست کارمندان تنها چیزی است که
 * بدون آن کار نمی‌کند؛ امضای زیر دقیقاً با قرارداد بقیه‌ی لیست‌های همین
 * بکند نوشته شده (`page`, `take`, و فیلترهای اختیاری).
 */

export async function fetchEmployees(params = {}) {
  const { data } = await axiosInstance.get("/User/GetUserList", {
    params: {
      page: params.page,
      take: params.limit,
      fullName: params.search || undefined,
      roleId: params.roleId !== "" ? params.roleId : undefined,
      isActive: accountStatusToIsActive(params.status),
    },
  });

  return normalizeListResponse(data, { itemsKey: "userList" });
}

/**
 * سرور برای کارمند دو خروجی دارد: `GetUserInfo` (کاربر *جاری*، از روی
 * توکن) و `GetUserUpdate` (یک کاربر مشخص، مخصوص پر کردن فرم ویرایش).
 * صفحه‌ی مدیریت همیشه دومی را می‌خواهد.
 */
export async function fetchEmployeeById(id) {
  const { data } = await axiosInstance.get("/User/GetUserUpdate", {
    params: { id },
  });
  return data;
}

export async function createEmployee(payload) {
  // `fisrtName` غلط املایی است ولی همان چیزی است که سرور می‌پذیرد
  // (سند، بخش ۳). اصلاحش اینجا یعنی نام خالی ذخیره شود.
  const { data } = await axiosInstance.post("/User/CreateUser", payload);
  return data;
}

export async function updateEmployee(payload) {
  const { data } = await axiosInstance.put("/User/UpdateUser", payload);
  return data;
}

/** حذف نرم: سرور فقط `isActive` را false می‌کند، رکورد را پاک نمی‌کند. */
export async function deactivateEmployee(id) {
  const { data } = await axiosInstance.delete("/User/DeleteUser", {
    params: { id },
  });
  return data;
}

/** خروج اجباری یک کارمند از تمام سشن‌هایش (عملیات ادمین). */
export async function logoutEmployee(id) {
  const { data } = await axiosInstance.post("/Account/LogoutUserById", {
    userId: Number(id),
  });
  return data;
}
