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

/**
 * `OrgPositionEnum` — جایگاهِ کاربر **در یک دامنه‌ی مشخص**: یک واحد، یا
 * یک تیم.
 *
 * `orgHeadRoleOf` بالا برای صفحه‌هایی است که واحد و تیم را با هم
 * می‌سنجند و یک برچسبِ واحد می‌خواهند. اینجا برعکس است: هر دامنه
 * جدا سنجیده می‌شود، چون یک نفر می‌تواند هم‌زمان معاونِ واحد و سرپرستِ
 * تیمش باشد و ادغامِ این دو در یک برچسب، یکی را پنهان می‌کند.
 *
 * مثل `AccountStatusEnum`، در بکند این یک enum نیست بلکه از مقایسه‌ی
 * `Department.HeadId`/`DeputyId` با شناسه‌ی کاربر مشتق می‌شود. عددی‌بودن
 * اینجا دو فایده دارد: هم‌شکل با بقیه‌ی enumهای دامنه، و ترتیب‌پذیر —
 * `HEAD > DEPUTY > MEMBER` یعنی «حداقل معاون» یک مقایسه‌ی ساده است.
 */
export const OrgPositionEnum = Object.freeze({
  MEMBER: 0,
  DEPUTY: 1,
  HEAD: 2,
});

export const ORG_POSITION_LABELS = Object.freeze({
  [OrgPositionEnum.MEMBER]: "عضو",
  [OrgPositionEnum.DEPUTY]: "معاون",
  [OrgPositionEnum.HEAD]: "سرپرست",
});

/**
 * سرپرستی یک صفتِ *مشتق* است: کاربری سرپرست است که شناسه‌اش در
 * `HeadId` آن ردیف نشسته باشد. پس ورودی خودِ ردیفِ واحد/تیم است، نه
 * فیلدی روی کاربر.
 *
 * وقتی ردیف نداریم (کاربرِ بدون تیم) `MEMBER` برمی‌گردد نه `null`:
 * `MEMBER` مقدارِ صفر است و اگر جایش `null` بنشیند، هر مقایسه‌ی
 * `>= DEPUTY` روی کاربرِ بدون تیم بی‌سروصدا درست از آب درمی‌آید.
 *
 * مقایسه با `==` عمدی است: شناسه گاهی از سرور عدد و از فرم رشته
 * می‌آید و `===` این دو را نابرابر می‌بیند.
 */
export function orgPositionIn(record, userId) {
  if (!record || userId == null) return OrgPositionEnum.MEMBER;
  if (record.headId != null && record.headId == userId) {
    return OrgPositionEnum.HEAD;
  }
  if (record.deputyId != null && record.deputyId == userId) {
    return OrgPositionEnum.DEPUTY;
  }
  return OrgPositionEnum.MEMBER;
}

/**
 * برچسبِ نمایشی. `MEMBER` عمداً `null` می‌دهد: «عضو» بودن حالتِ پیش‌فرضِ
 * همه است و نوشتنش کنارِ نامِ تیم فقط نویز است — جایی که واقعاً لازم
 * باشد، `ORG_POSITION_LABELS` مستقیم در دسترس است.
 */
export const orgPositionLabelOf = (position) =>
  position === OrgPositionEnum.MEMBER || position == null
    ? null
    : ORG_POSITION_LABELS[position];
