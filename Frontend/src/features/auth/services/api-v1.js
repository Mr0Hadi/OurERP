import axiosInstance from "@/shared/services/api/axios";

export async function login({ username, password }) {
  const { data } = await axiosInstance.post("/Account/Login", {
    username,
    password,
  });
  return data;
}

/**
 * سرور کاربر را از روی هدرِ `Authorization` پیدا می‌کند
 * (`LogoutUserCommand` هیچ پارامتری نمی‌گیرد)، پس بدنه‌ای لازم نیست.
 */
export async function logout() {
  const { data } = await axiosInstance.post("/Account/Logout");
  return data;
}

/**
 * کاربرِ جاری از `GET api/User/GetUserInfo`.
 *
 * `POST api/Account/Login` فقط توکن برمی‌گرداند؛ کاربر را همین endpoint از
 * روی خودِ توکن پیدا می‌کند و `UserInfoDto` را بی‌کم‌وکاست برمی‌گرداند:
 *
 *   { id, username, personelCode, firstName, lastName,
 *     departmentId, departmentName, teamId, teamName,
 *     role, roleTitle, isActive }
 *
 * هیچ‌چیز بازنویسی نمی‌شود — نه نامِ فیلد و نه شکلِ آن. `User` در بکند
 * ستونِ تصویر و فیلدِ دسترسی ندارد، و دقیقاً یک `departmentId` و حداکثر
 * یک `teamId` دارد؛ پس «آواتار»، «مجوزها» و فهرستِ «عضویت‌ها» هم اینجا
 * ساخته نمی‌شوند.
 */
export async function getUserInfo() {
  const { data } = await axiosInstance.get("/User/GetUserInfo");
  return data;
}


export async function getMyPermissions() {
  const { data } = await axiosInstance.get("/Permission/GetMyPermissions");
  return data;
}
