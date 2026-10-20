import axiosInstance from "@/shared/services/api/axios";

/**
 * لایه‌ی تماس با `api/Setting` (بخش ۲۲ سندِ api-guide.fa.md). خواندن با `SettingView` یا
 * `SettingManage`، ذخیره فقط با `SettingManage`.
 *
 * فهرستِ تنظیم‌ها در سرور تعریف شده؛ صفحه از روی همین پاسخ ساخته می‌شود تا تنظیمِ تازه
 * بدونِ تغییرِ فرانت بیاید.
 */

/** `GET GetSystemSettings` — آرایه‌ی `{ group, groupTitle, settings[] }`. */
export async function fetchSystemSettings() {
  const { data } = await axiosInstance.get("/Setting/GetSystemSettings");
  return data ?? [];
}

/**
 * `PUT UpdateSystemSettings` — `settings: [{ key, value }]`؛ `value` خالی یعنی بازگشت به
 * پیش‌فرض. همه یا هیچ. خروجی همان شکلِ `GetSystemSettings` است.
 */
export async function updateSystemSettings(settings) {
  const { data } = await axiosInstance.put("/Setting/UpdateSystemSettings", { settings });
  return data ?? [];
}
