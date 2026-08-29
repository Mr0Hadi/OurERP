// src/features/auth/services/api-mockData.js
import { orgPositionIn } from "@/shared/domain/enums/orgHeadRole";
import { allEmployees } from "@/features/employees/services/mockData";
import { allDepartments } from "@/features/organization/departments/services/mockData";
import { allTeams } from "@/features/organization/teams/services/mockData";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * کارمندی که در حالت mock «کاربرِ واردشده» فرض می‌شود.
 *
 * این یکی انتخاب شده چون پرمحتواترین حالتِ نمایشی را دارد: هم واحد، هم
 * تیم، و هم یک جایگاهِ سرپرستی (سرپرستِ «تیم ۱ فروش»).
 */
const MOCK_SESSION_USER_ID = 9;

/**
 * عضویت‌های *اضافیِ* کاربرِ mock.
 *
 * ⚠️ این‌ها امروز در بکند **وجود ندارند**: `User` دقیقاً یک
 * `DepartmentId` و حداکثر یک `TeamId` دارد، پس `api-v1` همیشه یک
 * عضویت برمی‌گرداند. اینجا عمداً چند تا ساخته می‌شود تا سوییچرِ
 * سایدبار (حالتِ «چند عضویتی») در حالت mock هم واقعاً تمرین شود و
 * روزی که بکند عضویت چندگانه گرفت، UI از قبل آماده باشد.
 *
 * هر قلم `[departmentId, teamId]` است.
 */
const MOCK_EXTRA_MEMBERSHIPS = [
  [4, 4], // واحد انبارداری / تیم انبار مرکزی
  [2, null], // واحد تامین، بدون تیم
];

/**
 * شناسه‌ی پایدارِ یک عضویت.
 *
 * ترکیبِ واحد و تیم است نه یک `id` مستقل، چون بکند برای عضویت جدولی
 * ندارد که کلید بدهد — عضویت همان جفتِ `DepartmentId`/`TeamId` روی خودِ
 * کاربر است. این را `api-v1` هم عیناً می‌سازد تا انتخابِ ذخیره‌شده در
 * localStorage بعد از سوییچِ mock→سرور بی‌معنا نشود.
 */
export const membershipIdOf = (departmentId, teamId) =>
  `${departmentId ?? "none"}:${teamId ?? "none"}`;

function buildMembership(userId, departmentId, teamId) {
  const department = allDepartments.find((item) => item.id === departmentId);
  const team = allTeams.find((item) => item.id === teamId);

  return {
    id: membershipIdOf(departmentId, teamId),
    departmentId: departmentId ?? null,
    departmentName: department?.name ?? null,
    departmentRole: orgPositionIn(department, userId),
    teamId: teamId ?? null,
    teamName: team?.name ?? null,
    teamRole: orgPositionIn(team, userId),
  };
}

/**
 * ورودِ ساختگی — هر نام کاربری و رمزی را می‌پذیرد.
 *
 * توکنِ برگشتی آشکارا جعلی است تا اگر کسی نیمی از برنامه را روی سرور و
 * نیمی را روی mock بگذارد، خطای ۴۰۱ سرور گویا باشد نه گیج‌کننده.
 */
export async function login({ username }) {
  await delay(400);

  if (!username) throw new Error("نام کاربری الزامی است");

  return {
    accessToken: "mock-access-token",
    refreshToken: "mock-refresh-token",
  };
}

export async function logout() {
  await delay(200);
  return { success: true };
}

/**
 * نشستِ کاربرِ جاری — همان قراردادی که `api-v1` هم برمی‌گرداند.
 *
 * نام واحد و تیم از خودِ ردیفِ واحد/تیم خوانده می‌شود نه از کپیِ
 * ذخیره‌شده روی کارمند، دقیقاً مثل بقیه‌ی mockها و مثل join سرور.
 */
export async function fetchSession() {
  await delay(300);

  const employee = allEmployees.find((item) => item.id === MOCK_SESSION_USER_ID);
  if (!employee) throw new Error("کاربر واردشده یافت نشد");

  const memberships = [
    buildMembership(employee.id, employee.departmentId, employee.teamId),
    ...MOCK_EXTRA_MEMBERSHIPS.map(([departmentId, teamId]) =>
      buildMembership(employee.id, departmentId, teamId),
    ),
  ];

  return {
    id: employee.id,
    username: employee.username,
    firstName: employee.firstName,
    lastName: employee.lastName,
    // فالبک به نام کاربری عیناً مثل `api-v1` — بدونش کارمندی با نامِ
    // خالی در mock رشته‌ی تهی می‌داد و روی سرور نام کاربری، و
    // `nav-user` در یکی خالی می‌شد و در دیگری نه.
    fullName:
      `${employee.firstName} ${employee.lastName}`.trim() || employee.username,
    personelCode: employee.personelCode,
    isActive: employee.isActive,
    // خالی، چون سرور هم خالی می‌دهد: مجوزها در بکند هنوز پیاده نشده‌اند.
    // پرکردنش اینجا یعنی mock چیزی را وعده بدهد که سرور نمی‌تواند.
    permissions: [],
    // null به همان دلیل: `User` در بکند ستونِ تصویر ندارد. اگر اینجا یک
    // تصویرِ الکی می‌گذاشتیم، سایدبار در mock آواتار داشت و روی سرور
    // ناگهان حروفِ اول — یعنی mock طراحی را بر پایه‌ی چیزی می‌ساخت که
    // وجود ندارد.
    avatar: null,
    memberships,
  };
}
