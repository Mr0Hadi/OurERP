/**
 * `OrgRoleEnum` — نقشِ کاربر در چارت سازمانی. هم‌شماره با
 * `Domain/Enums/OrgRoleEnum.cs` در بکند.
 *
 * هر کاربر همیشه دقیقاً در یک واحد است و در هر لحظه **دقیقاً یکی** از این
 * نقش‌ها را دارد:
 *
 *   - مسئول/جانشینِ واحد عضوِ هیچ تیمی نیست (`teamId = null`)؛
 *   - مسئول/جانشینِ تیم حتماً عضوِ همان تیم است.
 *
 * بکند این مقدار را ذخیره نمی‌کند؛ از `headId`/`deputyId` تیم و واحد
 * مشتقش می‌کند و در `GetUserList`/`GetUserInfo`/`GetUserUpdate` به‌صورت
 * `role` + `roleTitle` برمی‌گرداند. `UpdateUser` هم آن را به‌صورت اختیاری
 * می‌پذیرد.
 */
export const OrgRoleEnum = Object.freeze({
  MEMBER: 0,
  DEPARTMENT_HEAD: 1,
  DEPARTMENT_DEPUTY: 2,
  TEAM_HEAD: 3,
  TEAM_DEPUTY: 4,
});

/** همان متن‌های `[Description]` بکند — `roleTitle` هم همین‌ها را می‌دهد. */
export const ORG_ROLE_LABELS = Object.freeze({
  [OrgRoleEnum.MEMBER]: "عضو",
  [OrgRoleEnum.DEPARTMENT_HEAD]: "مسئول واحد",
  [OrgRoleEnum.DEPARTMENT_DEPUTY]: "جانشین واحد",
  [OrgRoleEnum.TEAM_HEAD]: "مسئول تیم",
  [OrgRoleEnum.TEAM_DEPUTY]: "جانشین تیم",
});

const TEAM_ROLES = Object.freeze([
  OrgRoleEnum.MEMBER,
  OrgRoleEnum.TEAM_HEAD,
  OrgRoleEnum.TEAM_DEPUTY,
]);

const DEPARTMENT_ROLES = Object.freeze([
  OrgRoleEnum.MEMBER,
  OrgRoleEnum.DEPARTMENT_HEAD,
  OrgRoleEnum.DEPARTMENT_DEPUTY,
]);

/**
 * نقش‌هایی که با این جایگاه ممکن‌اند. سرور نقشِ تیمی بدون تیم، و نقشِ
 * واحدی برای کسی که در تیم است، را با ۴۰۰ رد می‌کند.
 */
export const orgRolesFor = (teamId) =>
  teamId != null ? TEAM_ROLES : DEPARTMENT_ROLES;
