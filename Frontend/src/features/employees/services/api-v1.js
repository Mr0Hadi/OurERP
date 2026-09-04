// src/features/employees/services/api-v1.js
import axiosInstance from "@/shared/services/api/axios";
import { normalizeListResponse } from "@/shared/services/api/contract";
import { accountStatusToIsActive } from "@/shared/domain/enums/accountStatus";

/**
 * لایه‌ی سرورِ فیچر کارمندان — نگاشت مستقیم روی `api/User` و
 * `api/Account/LogoutUserById`.
 *
 * پوششِ `ResponseDto` را axios باز می‌کند، پس اینجا `data` همان محتوای
 * `Data` است.
 *
 * قرارداد سه نکته‌ی مهم دارد که شکلِ کلِ فیچر را تعیین می‌کند:
 *
 *   ۱. کارمند **نقش ندارد**. `UserController` هیچ‌جا `roleId` نمی‌گیرد و
 *      نمی‌دهد؛ سرپرستی روی خودِ واحد و تیم ذخیره می‌شود.
 *   ۲. واحد اجباری و تیم اختیاری است، و سرور خودش چک می‌کند که تیم
 *      متعلق به همان واحد باشد.
 *   ۳. `PersonelCode` را **سرور** باید بسازد. `CreateUserCommand` فعلاً
 *      آن را از کلاینت می‌گیرد و اجباری اعتبارسنجی می‌کند؛ تا وقتی این
 *      در بکند اصلاح نشود، ثبت کارمند از این مسیر ۴۰۰ می‌گیرد. عمداً
 *      اینجا مقداری ساخته نمی‌شود — کد پرسنلی باید یکتا و پیوسته بماند و
 *      کلاینت نمی‌تواند این را تضمین کند.
 */

/** فیلترِ خالی نباید روی سیم برود — سرور آن را «مقدارِ صفر» می‌فهمد. */
const filterValue = (value) =>
  value === "" || value == null ? undefined : value;

export async function fetchEmployees(params = {}) {
  const { data } = await axiosInstance.get("/User/GetUserList", {
    params: {
      page: params.page,
      take: params.limit,
      fullName: params.search || undefined,
      departmentId: filterValue(params.departmentId),
      teamId: filterValue(params.teamId),
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
  // `fisrtName` غلط املایی است ولی همان چیزی است که سرور می‌پذیرد.
  // اصلاحش اینجا یعنی نام خالی ذخیره شود.
  const { data } = await axiosInstance.post("/User/CreateUser", {
    fisrtName: payload.fisrtName,
    lastName: payload.lastName,
    username: payload.username,
    password: payload.password,
    departmentId: payload.departmentId,
    teamId: payload.teamId ?? null,
  });
  return data;
}

export async function updateEmployee(payload) {
  const { data } = await axiosInstance.put("/User/UpdateUser", {
    id: payload.id,
    firstName: payload.firstName,
    lastName: payload.lastName,
    username: payload.username,
    departmentId: payload.departmentId,
    teamId: payload.teamId ?? null,
    isActive: payload.isActive,
  });
  return data;
}

/**
 * جابه‌جاییِ عضویتِ سازمانی — دستور اختصاصیِ خودِ سرور
 * (`ChangeUserTeamCommand`)، نه `UpdateUser`.
 *
 * دو کارِ اضافه انجام می‌دهد که `UpdateUser` نمی‌کند و دستی هم نمی‌شود
 * انجامشان داد: اگر کاربر مدیرِ تیمِ *قبلی* بوده، آن سرپرستی را باز
 * می‌کند؛ و با `isHead` همان کاربر را مدیرِ تیمِ جدید می‌کند.
 *
 * `departmentId` اجباری است (سرور `> 0` می‌خواهد)، حتی وقتی فقط داریم
 * کاربر را از تیم خارج می‌کنیم — در آن حالت واحدِ فعلیِ خودش فرستاده
 * می‌شود.
 */
export async function assignEmployeeMembership({
  userId,
  departmentId,
  teamId,
  isHead = false,
}) {
  const { data } = await axiosInstance.put("/User/ChangeUserTeam", {
    userId: Number(userId),
    departmentId: Number(departmentId),
    teamId: teamId ?? null,
    isHead: Boolean(isHead),
  });
  return data;
}

/** حذف نرم: سرور فقط `isActive` را false می‌کند، رکورد را پاک نمی‌کند. */
export async function removeEmployee(id) {
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
