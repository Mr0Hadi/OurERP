/** کمک‌تابع‌های مجموعه روی اعدادِ دسترسی — بدون وابستگی به React. */

export const toNumberSet = (items) =>
  new Set((items ?? []).map((item) => item.permission));

export const sameSet = (a, b) =>
  a.size === b.size && [...a].every((value) => b.has(value));

export const difference = (a, b) => [...a].filter((value) => !b.has(value));

/** اعداد به همان ترتیبِ کاتالوگ — برای ارسالِ پایدار به سرور. */
export const orderedByCatalogue = (groups, set) =>
  groups
    .flatMap((group) => group.permissions.map((p) => p.permission))
    .filter((permission) => set.has(permission));

/** شمارِ تیک‌خورده‌ها در هر گروه — برای خلاصه‌ها. */
export const groupCounts = (groups, set) =>
  groups
    .map((group) => ({
      group: group.group,
      title: group.groupTitle,
      total: group.permissions.length,
      count: group.permissions.filter((p) => set.has(p.permission)).length,
    }))
    .filter((row) => row.count > 0);
