import axiosInstance from "@/shared/services/api/axios";

/**
 * شناسه‌ی پایدارِ یک عضویت.
 *
 * بکند برای عضویت جدولی ندارد که کلید بدهد؛ عضویت همان جفتِ
 * `DepartmentId`/`TeamId` روی خودِ `User` است. این شناسه سمتِ فرانت
 * ساخته می‌شود تا انتخابِ ذخیره‌شده‌ی کاربر در `authStore` کلیدی داشته
 * باشد که بین رفرش‌ها ثابت بماند.
 */
export const membershipIdOf = (departmentId, teamId) =>
  `${departmentId ?? "none"}:${teamId ?? "none"}`;

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
 * نشستِ کاربرِ جاری از `GET api/User/GetUserInfo`.
 *
 * `POST api/Account/Login` فقط توکن برمی‌گرداند؛ کاربر را همین endpoint از
 * روی خودِ توکن پیدا می‌کند. `UserInfoDto` نامِ واحد و تیم و نقشِ سازمانی
 * (`role`/`roleTitle`) را خودش دارد، پس درخواستِ جداگانه‌ای به جزئیات
 * واحد یا تیم لازم نیست.
 *
 * ⚠️ `memberships` امروز همیشه **یک** قلم دارد: `User` در بکند دقیقاً یک
 * `DepartmentId` و حداکثر یک `TeamId` دارد. آرایه‌بودنش برای آینده است
 * — سایدبار وقتی بیش از یکی باشد خودش سوییچر نشان می‌دهد.
 */
export async function fetchSession() {
  const { data: user } = await axiosInstance.get("/User/GetUserInfo");

  const firstName = user.firstName ?? "";
  const lastName = user.lastName ?? "";

  return {
    id: user.id,
    username: user.username,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim() || user.username,
    personelCode: user.personelCode ?? null,
    isActive: user.isActive,

    /**
     * ⚠️ همیشه null: موجودیتِ `User` در بکند ستونِ تصویر ندارد. صریح
     * اعلام می‌شود تا `nav-user` فیلدی بخواند که در قرارداد هست.
     */
    avatar: null,

    /**
     * ⚠️ همیشه خالی: `UserInfoDto` فیلدِ دسترسی ندارد. سطح دسترسی در بکند
     * هنوز پیاده نشده و قرار است بر پایه‌ی `departmentId` باشد.
     */
    permissions: [],

    memberships: [
      {
        id: membershipIdOf(user.departmentId, user.teamId),
        departmentId: user.departmentId ?? null,
        departmentName: user.departmentName ?? null,
        teamId: user.teamId ?? null,
        teamName: user.teamName ?? null,
        role: user.role,
        roleTitle: user.roleTitle,
      },
    ],
  };
}
