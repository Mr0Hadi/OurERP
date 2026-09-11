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
 *   ۱. «نقش» یعنی **نقشِ سازمانی** (`OrgRoleEnum`: عضو، مسئول/جانشینِ واحد،
 *      مسئول/جانشینِ تیم)، نه سطح دسترسی. سرور ذخیره‌اش نمی‌کند؛ از
 *      `headId`/`deputyId` تیم و واحد مشتقش می‌کند و در فهرست و جزئیات به
 *      شکلِ `role` + `roleTitle` برمی‌گرداند.
 *   ۲. واحد اجباری و تیم اختیاری است، و سرور خودش چک می‌کند که تیم
 *      متعلق به همان واحد باشد.
 *   ۳. `PersonelCode` را **سرور** می‌سازد (sequence دیتابیس، از ۱۰۰۰).
 *      نه در ثبت فرستاده می‌شود و نه در ویرایش؛ فقط نمایش داده می‌شود.
 *   ۴. `UpdateUser` جایگاه و نقش را با هم می‌نویسد. `role` اختیاری است:
 *      `null` یعنی «به نقش دست نزن» — اگر کاربر جابه‌جا نشده حفظ می‌شود و
 *      اگر جابه‌جا شده آزاد می‌شود. غیرفعال‌کردن هم نقش را آزاد می‌کند.
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
      // فیلترِ کاملاً جدا از `fullName` — تطبیقِ دقیقِ عددی روی کدِ
      // پرسنلی، نه Contains روی نام.
      personelCode: filterValue(params.personelCode),
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
    role: payload.role ?? null,
    isActive: payload.isActive,
  });
  return data;
}

/**
 * جابه‌جاییِ عضویتِ سازمانی — دستور اختصاصیِ خودِ سرور
 * (`ChangeUserTeamCommand`)، نه `UpdateUser`.
 *
 * نقشِ قبلیِ کاربر را آزاد می‌کند و با `isHead` یا `isDeputy` او را مسئول
 * یا جانشینِ مقصد می‌کند: تیم اگر `teamId` داده شود، وگرنه خودِ واحد. هر
 * دو false یعنی «عضو ساده» — برخلافِ `UpdateUser`، نقش اینجا هیچ‌وقت
 * ضمنی حفظ نمی‌شود. سرور هم‌زمانیِ `isHead` و `isDeputy` را رد می‌کند.
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
  isDeputy = false,
}) {
  const { data } = await axiosInstance.put("/User/ChangeUserTeam", {
    userId: Number(userId),
    departmentId: Number(departmentId),
    teamId: teamId ?? null,
    isHead: Boolean(isHead),
    isDeputy: Boolean(isDeputy) && !isHead,
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
