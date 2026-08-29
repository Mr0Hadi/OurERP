// src/shared/domain/enums/orgHeadRole.js

/**
 * جایگاهِ سرپرستی — «هد تیم» و «هد واحد».
 *
 * ⚠️ این یک فیلدِ روی کاربر **نیست**. نقش‌ها (`User.RoleId` و جدول
 * `Roles`) در migration `remove-role` از بکند حذف شده‌اند و سرپرستی
 * فقط با دو ستون بیان می‌شود:
 *
 *   `Department.HeadId` → هد واحد
 *   `Team.HeadId`       → هد تیم
 *
 * یعنی «جایگاه» یک صفتِ *مشتق* است: کاربری هد است که شناسه‌اش در
 * `HeadId` واحد یا تیمش نشسته باشد. برای همین اینجا فقط برچسب و یک
 * تابعِ تشخیص هست، نه enum ای که روی سیم برود — هیچ endpoint ای
 * `roleId` نمی‌گیرد و نمی‌دهد.
 *
 * تعیینِ سرپرست هم در همان جایی انجام می‌شود که ذخیره می‌شود: صفحه‌ی
 * جزئیات واحد (`UpdateDepartment`) و صفحه‌ی جزئیات تیم
 * (`UpdateTeam` یا `ChangeUserTeam` با `isHead`).
 */
export const OrgHeadRole = Object.freeze({
  DEPARTMENT_HEAD: "departmentHead",
  TEAM_HEAD: "teamHead",
  MEMBER: "member",
});

export const ORG_HEAD_ROLE_LABELS = Object.freeze({
  [OrgHeadRole.DEPARTMENT_HEAD]: "هد واحد",
  [OrgHeadRole.TEAM_HEAD]: "هد تیم",
  [OrgHeadRole.MEMBER]: "عضو",
});

/**
 * جایگاهِ یک کارمند نسبت به واحد و تیمی که *همان صفحه* در دست دارد.
 *
 * هر دو شناسه اختیاری‌اند چون صفحه‌ها معمولاً فقط یکی را می‌دانند:
 * صفحه‌ی جزئیات تیم `team.headId` دارد و از هد واحد بی‌خبر است.
 */
export function orgHeadRoleOf(employeeId, { departmentHeadId, teamHeadId } = {}) {
  if (employeeId == null) return OrgHeadRole.MEMBER;
  if (departmentHeadId != null && departmentHeadId === employeeId) {
    return OrgHeadRole.DEPARTMENT_HEAD;
  }
  if (teamHeadId != null && teamHeadId === employeeId) {
    return OrgHeadRole.TEAM_HEAD;
  }
  return OrgHeadRole.MEMBER;
}

export const orgHeadRoleLabelOf = (...args) =>
  ORG_HEAD_ROLE_LABELS[orgHeadRoleOf(...args)];
