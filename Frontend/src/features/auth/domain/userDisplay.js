/**
 * نمایشِ کاربرِ واردشده (`UserInfoDto`) — منوی کاربر و صفحه‌ی حساب.
 */

/**
 * حرفِ اولِ نام و نام خانوادگی.
 *
 * `slice(0, 2)` روی فارسی غلط است: دو حرفِ اولِ *یک* کلمه را برمی‌دارد
 * («ام» از «امیر») که نه سرنامِ کسی است و نه خوانا.
 */
export function initialsOf(user) {
  const first = user.firstName?.trim()?.[0];
  const last = user.lastName?.trim()?.[0];
  const initials = [first, last].filter(Boolean).join("");

  return initials || user.username?.slice(0, 2) || "؟";
}

/** `UserInfoDto` نامِ کامل ندارد؛ از `firstName`/`lastName` ساخته می‌شود. */
export const fullNameOf = (user) =>
  `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username;
