import axiosInstance from "@/shared/services/api/axios";
import { useAuthStore } from "../store/authStore";

/**
 * اولین درخواستِ بعد از بیکاریِ سرور (راه‌اندازیِ دوباره‌ی application pool روی IIS،
 * اتصالِ اولِ دیتابیس) می‌تواند از سقفِ پیش‌فرضِ ۱۵ ثانیه بگذرد؛ لاگین معمولاً همان
 * درخواستِ اول است، پس سقفِ بلندتری دارد تا به‌جای خطا فقط کند باشد.
 */
const LOGIN_TIMEOUT_MS = 45_000;

export async function login({ username, password }) {
  const { data } = await axiosInstance.post(
    "/Account/Login",
    { username, password },
    { timeout: LOGIN_TIMEOUT_MS },
  );
  return data;
}

/**
 * سرور کاربر را از روی هدرِ `Authorization` پیدا می‌کند (`LogoutUserCommand` هیچ
 * پارامتری نمی‌گیرد)، ولی اکشن `[FromBody]` است: بدنه‌ی خالی ۴۰۰ می‌گرفت و نشستِ
 * سرور هیچ‌وقت بسته نمی‌شد؛ برای همین `{}` فرستاده می‌شود.
 *
 * منتظرِ پاسخ نمی‌ماند: سرورِ کند خروج را ۱۵–۲۰ ثانیه معطل می‌کرد، در حالی که
 * خروجِ محلی (پاک‌کردنِ توکن و بارگذاریِ دوباره) به سرور نیازی ندارد. آداپترِ `fetch`ِ
 * axios با `keepalive`: درخواستِ معمولی (XHR) با بارگذاریِ دوباره‌ی صفحه (`leaveSession`)
 * لغو می‌شد و به سرور نمی‌رسید؛ `keepalive` بعد از ترکِ صفحه هم ارسال می‌شود.
 * توکن همین‌جا گرفته و صریح فرستاده می‌شود، چون store بلافاصله بعد از این پاک می‌شود
 * و interceptorِ درخواست شاید دیرتر اجرا شود.
 */
export function logout() {
  const token = useAuthStore.getState().accessToken;
  if (!token) return;
  axiosInstance
    .post("/Account/Logout", {}, {
      adapter: "fetch",
      fetchOptions: { keepalive: true },
      headers: { Authorization: `Bearer ${token}` },
    })
    .catch(() => {});
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
export async function getUserInfo({ signal } = {}) {
  const { data } = await axiosInstance.get("/User/GetUserInfo", { signal });
  return data;
}


export async function getMyPermissions() {
  const { data } = await axiosInstance.get("/Permission/GetMyPermissions");
  return data;
}

/**
 * سوییچ‌های عمومیِ قابلیت‌ها از `GET api/Setting/GetFeatureFlags` — نگاشتِ کلید ← مقدارِ
 * تایپ‌شده (`{ "Warehouse.MultiWarehouseEnabled": false, ... }`). بدونِ دسترسیِ خاص، برای
 * هر کاربرِ واردشده؛ فقط تنظیم‌هایی که در کاتالوگِ سرور `isPublic` هستند.
 */
export async function getFeatureFlags() {
  const { data } = await axiosInstance.get("/Setting/GetFeatureFlags");
  return data ?? {};
}

/**
 * `PUT api/User/ChangePassword` — رمزِ *کاربرِ جاری* (از روی توکن)، با رمزِ فعلی.
 * همه‌ی نشست‌ها، حتی همین توکن، بسته می‌شوند و `data` جفتِ توکنِ تازه است (شکلِ `Login`).
 * در حالتِ «تغییرِ رمزِ اجباری» هم مجاز است.
 */
export async function changePassword({ oldPassword, password, rePassword }) {
  const { data } = await axiosInstance.put("/User/ChangePassword", {
    oldPassword,
    password,
    rePassword,
  });
  return data;
}

/** `PUT api/User/UpdateUserInfo` — نام و نام خانوادگیِ کاربرِ جاری؛ بی‌دسترسیِ خاص. */
export async function updateUserInfo({ firstName, lastName }) {
  const { data } = await axiosInstance.put("/User/UpdateUserInfo", { firstName, lastName });
  return data;
}
