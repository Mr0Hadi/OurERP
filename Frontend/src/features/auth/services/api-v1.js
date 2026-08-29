// src/features/auth/services/api-v1.js
import axiosInstance from "@/shared/services/api/axios";
import { orgPositionIn } from "@/shared/domain/enums/orgHeadRole";
import { fetchDepartmentById } from "@/features/organization/departments/services/api-v1";
import { fetchTeamById } from "@/features/organization/teams/services/api-v1";

/**
 * شناسه‌ی پایدارِ یک عضویت — عیناً همان چیزی که `api-mockData` می‌سازد.
 *
 * بکند برای عضویت جدولی ندارد که کلید بدهد؛ عضویت همان جفتِ
 * `DepartmentId`/`TeamId` روی خودِ `User` است. یکسان‌بودنِ این فرمول در
 * دو طرف یعنی انتخابِ ذخیره‌شده‌ی کاربر بعد از سوییچِ mock→سرور
 * بی‌معنا نمی‌شود.
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
 * نشستِ کاربرِ جاری، ساخته‌شده از سه endpointِ موجود.
 *
 * ⚠️ چرا سه تا و نه یکی: `POST api/Account/Login` فقط
 * `TokenDto { AccessToken, RefreshToken }` برمی‌گرداند و **هیچ**
 * اطلاعاتی از خودِ کاربر ندارد. تا وقتی بکند پاسخِ ورود را کامل نکرده،
 * تنها راهِ دانستنِ اینکه «کی وارد شده» این است:
 *
 *   ۱. `GET api/User/GetUserInfo` — کاربر را از روی خودِ توکن پیدا
 *      می‌کند (`UserContextService`)، پس نیازی به شناسه‌ی ذخیره‌شده
 *      سمت کلاینت نیست. ولی فقط `departmentId`/`teamId` می‌دهد.
 *   ۲و۳. `GetDepartmentDetail`/`GetTeamDetail` — *نامِ* واحد و تیم، و
 *      `HeadId`/`DeputyId` که جایگاهِ سرپرستی از رویشان مشتق می‌شود.
 *
 * هر دو فراخوانیِ دوم و سوم موازی‌اند چون به هم وابسته نیستند.
 *
 * ⚠️ `memberships` امروز همیشه **یک** قلم دارد: `User` در بکند دقیقاً یک
 * `DepartmentId` و حداکثر یک `TeamId` دارد. آرایه‌بودنش برای آینده است
 * — سایدبار وقتی بیش از یکی باشد خودش سوییچر نشان می‌دهد و آن روز فقط
 * همین تابع عوض می‌شود، نه هیچ کامپوننتی.
 */
export async function fetchSession() {
  const { data: user } = await axiosInstance.get("/User/GetUserInfo");

  const [department, team] = await Promise.all([
    user.departmentId ? fetchDepartmentById(user.departmentId) : null,
    user.teamId ? fetchTeamById(user.teamId) : null,
  ]);

  const firstName = user.firstName ?? "";
  const lastName = user.lastName ?? "";

  return {
    id: user.id,
    username: user.username,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim() || user.username,
    // `UserInfoDto` کدِ پرسنلی ندارد؛ اگر روزی اضافه شد اینجا خودش پر می‌شود.
    personelCode: user.personelCode ?? null,
    isActive: user.isActive,

    /**
     * ⚠️ همیشه null: موجودیتِ `User` در بکند اصلاً ستونِ تصویر ندارد
     * (`ImageFolderEnum` هم فقط PRODUCTS/CUSTOMERS/SUPPLIERS/RECEIVING
     * دارد، نه USERS). اینجا صریح اعلام می‌شود تا `nav-user` فیلدی
     * بخواند که در قرارداد هست — نه یک فیلدِ موهوم که همیشه undefined
     * است و کسی نمی‌داند عمدی است یا فراموش شده.
     */
    avatar: user.avatar ?? null,

    /**
     * ⚠️ امروز همیشه خالی است: `UserInfoDto.Permissions` در بکند وجود
     * دارد ولی نگاشتش در `MappingProfile` کامنت شده و جدولِ `Roles` در
     * migration `remove-role` حذف شده. اینجا خوانده می‌شود تا روزی که
     * بکند دوباره پرش کرد، `hasPermission` بدون تغییرِ کد شروع به کار
     * کند — نه اینکه آن روز تازه دنبال جایش بگردیم.
     */
    permissions: (user.permissions ?? []).map((item) => item.title),

    memberships: [
      {
        id: membershipIdOf(user.departmentId, user.teamId),
        departmentId: user.departmentId ?? null,
        departmentName: department?.name ?? null,
        departmentRole: orgPositionIn(department, user.id),
        teamId: user.teamId ?? null,
        teamName: team?.name ?? null,
        teamRole: orgPositionIn(team, user.id),
      },
    ],
  };
}
