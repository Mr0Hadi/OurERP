// src/shared/domain/enums/userRole.js

/**
 * `UserRolesEnum` — نقش کارمندی که با سیستم کار می‌کند (بخش ۱۵ سند
 * api-guide.fa.md). مقادیر باید دقیقاً با اعداد بکند یکی بمانند؛ روی سیم
 * همیشه عدد است.
 *
 * توجه: این enum یک *مرجع کمکی* است، نه منبع حقیقت. نقش‌های واقعی در جدول
 * `Role` دیتابیس نگه‌داری می‌شوند و طبق بخش ۱۶ سند، هنوز endpoint ای برای
 * گرفتن فهرست آن‌ها وجود ندارد. تا آن روز فرم‌ها از همین دو مقدار استفاده
 * می‌کنند؛ وقتی `GetRoleList` اضافه شد، فقط منبعِ options عوض می‌شود و
 * بقیه‌ی فیچر دست نمی‌خورد.
 */
export const UserRoleEnum = Object.freeze({
  ADMIN: 1,
  USER: 2,
});

export const USER_ROLE_LABELS = Object.freeze({
  [UserRoleEnum.ADMIN]: "مدیر سیستم",
  [UserRoleEnum.USER]: "کارمند",
});

/** options آماده برای Select — تا هر فرم دوباره Object.entries نزند. */
export const USER_ROLE_OPTIONS = Object.entries(USER_ROLE_LABELS).map(
  ([value, label]) => ({ value: Number(value), label }),
);
