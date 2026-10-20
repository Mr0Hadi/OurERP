import { Building2, CalendarClock, ShieldCheck, ShoppingCart, SlidersHorizontal, Wallet, Warehouse } from "lucide-react";

/** `SystemSettingTypeEnum`ِ بکند. */
export const SETTING_TYPE = Object.freeze({ INTEGER: 1, BOOLEAN: 2, TEXT: 3 });

/** آیکنِ هر `SystemSettingGroupEnum`؛ گروهِ تازه‌ی سرور آیکنِ عمومی می‌گیرد. */
const GROUP_ICONS = { 1: ShoppingCart, 2: Wallet, 3: CalendarClock, 4: Warehouse, 5: Building2, 6: ShieldCheck };
export const groupIcon = (group) => GROUP_ICONS[group] ?? SlidersHorizontal;

/** شناسه‌ی لنگرِ هر گروه برای پرشِ ناوبری. */
export const groupAnchor = (group) => `setting-group-${group}`;

/*
 * مدلِ پیش‌نویس: سرور در `value` همیشه مقدارِ *مؤثر* را می‌دهد (ذخیره‌نشده ⇒ همان پیش‌فرض) و
 * پیش‌نویس هم مقدارِ مؤثر نگه می‌دارد. «بازگشت به پیش‌فرض» یعنی پیش‌نویس = `defaultValue`؛
 * فقط موقعِ ارسال، مقدارِ برابر با پیش‌فرض `""` فرستاده می‌شود تا سطرِ ذخیره‌شده پاک شود.
 */

/** مقدارِ ذخیره‌شده‌ی سرور برای فرم. */
export const serverValue = (setting) => setting.value ?? setting.defaultValue ?? "";

/** با پیش‌فرض فرق دارد («سفارشی»)؟ */
export const isCustomValue = (setting, value) => value !== (setting.defaultValue ?? "");

/**
 * خطای یک مقدارِ ویرایش‌شده، یا `null`. همان قاعده‌های سرور (عدد صحیح و حدود) تا ۴۰۰ِ
 * «همه یا هیچ» پیش از ارسال دیده شود.
 */
export function settingValueError(setting, value) {
  if (setting.type !== SETTING_TYPE.INTEGER) return null;
  if (value === "") return "مقدار را وارد کنید.";
  if (!/^-?\d+$/.test(value)) return "عدد صحیح وارد کنید.";
  const n = Number(value);
  if (setting.minValue != null && n < setting.minValue) return `کمتر از ${setting.minValue} مجاز نیست.`;
  if (setting.maxValue != null && n > setting.maxValue) return `بیشتر از ${setting.maxValue} مجاز نیست.`;
  return null;
}

/** تغییرهای پیش‌نویس نسبت به مقدارِ سرور، به شکلِ بدنه‌ی `UpdateSystemSettings`. */
export function changedSettings(groups, draft) {
  return groups
    .flatMap((g) => g.settings)
    .filter((s) => s.key in draft && draft[s.key] !== serverValue(s))
    .map((s) => ({ key: s.key, value: isCustomValue(s, draft[s.key]) ? draft[s.key] : "" }));
}

/** نمایشِ یک مقدارِ خام («روشن»، «۱۰ دقیقه»). */
export function formatSettingValue(setting, raw) {
  if (setting.type === SETTING_TYPE.BOOLEAN) return raw === "true" ? "روشن" : "خاموش";
  return setting.unit ? `${raw} ${setting.unit}` : raw;
}

/**
 * ویرایشگرِ ویژه‌ی تنظیم‌های متنیِ شناخته‌شده. کلیدها قراردادِ ثابتِ سرورند؛ کلیدِ ناشناخته
 * همان ورودیِ متنیِ ساده را می‌گیرد.
 *   - `digits`: فقط رقم (رقمِ فارسی به لاتین)، چپ‌چین
 *   - `multiline`: چندخطی، تمام‌عرض
 */
const TEXT_KIND = {
  "Company.NationalId": "digits",
  "Company.EconomicCode": "digits",
  "Company.RegistrationNumber": "digits",
  "Company.PhoneNumber": "digits",
  "Company.PostalCode": "digits",
  "Company.Address": "multiline",
};
export const textKind = (setting) => TEXT_KIND[setting.key] ?? "text";

/** استان و شهر با یک `CitySelector` ویرایش می‌شوند (به نامِ فارسی ذخیره می‌شوند). */
export const PROVINCE_KEY = "Company.Province";
export const CITY_KEY = "Company.City";

/** گروهی که همه‌اش متن است (مثلِ مشخصاتِ شرکت) به شکلِ فرمِ دوستونی نمایش داده می‌شود. */
export const isFormGroup = (group) =>
  group.settings.length > 0 && group.settings.every((s) => s.type === SETTING_TYPE.TEXT);
