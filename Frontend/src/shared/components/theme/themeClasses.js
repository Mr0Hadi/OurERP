/**
 * نگاشتِ مقدارِ ذخیره‌شده‌ی تم به کلاس‌های `<html>`.
 *
 * تم‌های قدیمی (`light`، `dark`، `theme-*`) هر کدام یک کلاس‌اند. تمِ Material
 * دو کلاسِ هم‌زمان می‌گیرد: `theme-material` (توکن‌های Material) و
 * `light|dark` (تا واریانتِ `dark:` و توکن‌های پایه مثل قبل کار کنند).
 *
 * این منطق در اسکریپتِ inlineِ `index.html` هم تکرار شده؛ هر تغییری باید
 * در هر دو جا اعمال شود.
 */
export const MATERIAL_THEMES = ["material-light", "material-dark"]

export const THEME_CLASSES = [
  "light",
  "dark",
  "theme-material",
  "theme-accessible",
  "theme-rose",
  "theme-forest",
]

export function resolveThemeClasses(theme, prefersDark) {
  if (theme === "system") return [prefersDark ? "dark" : "light"]
  if (theme === "material-light") return ["theme-material", "light"]
  if (theme === "material-dark") return ["theme-material", "dark"]
  return [theme]
}
