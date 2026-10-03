import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import gregorian from "react-date-object/calendars/gregorian";

/**
 * "2024-08-02" (ISO) → "1403/05/12" | خالی → ""
 *
 * ورودی می‌تواند timestamp کامل هم باشد ("2024-08-02T10:15:00Z") — همان
 * چیزی که سرور واقعاً می‌فرستد. بخش ساعت بریده می‌شود،
 * وگرنه `DateObject` با فرمتِ "YYYY-MM-DD" آن را نمی‌فهمد و ستون تاریخ
 * بی‌صدا خالی می‌ماند.
 */
export function gregorianToPersian(gregorianDateStr) {
  if (!gregorianDateStr) return "";
  try {
    const dateOnly = String(gregorianDateStr).slice(0, 10);
    const d = new DateObject({ date: dateOnly, calendar: gregorian, format: "YYYY-MM-DD" });
    d.convert(persian);
    d.setLocale(persian_fa);
    return d.format("YYYY/MM/DD");
  } catch {
    return "";
  }
}

/**
 * هر تاریخی که سرور می‌فرستد → "YYYY-MM-DD".
 *
 * بکند `DateTime` را کامل سریالایز می‌کند ("2026-04-01T00:00:00")، ولی
 * `PersianDatePicker` و مقایسه‌های فرم فقط با بخشِ تاریخ کار می‌کنند و
 * رشته‌ی زمان‌دار را بی‌صدا نامعتبر می‌گیرند — نتیجه‌اش فیلدِ خالیِ
 * «تاریخ فاکتور» بود. برشِ ساده کافی است چون سرور تاریخِ سند را بدون
 * منطقه‌ی زمانی و در نیمه‌شبِ محلی می‌فرستد.
 */
export function toDateOnly(value) {
  if (!value) return "";
  const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);
  // `0001-01-01` همان `DateTime.MinValue`ِ .NET است: بکند گاهی تاریخِ خالی را به‌جای
  // null این‌طور می‌فرستد (بندِ ۷.۴ سندِ frontend-requests.fa.md) — یعنی «تاریخ ندارد».
  if (!match || match[0].startsWith("0001-")) return "";
  return match[0];
}

const pad = (n) => String(n).padStart(2, "0");

/**
 * امروز به وقتِ محلی، "YYYY-MM-DD" — پیش‌فرضِ فیلدهای تاریخِ فرم.
 *
 * `new Date().toISOString()` وقتِ UTC است: بینِ نیمه‌شب تا ۳:۳۰ بامدادِ
 * تهران تاریخِ دیروز را می‌داد.
 */
export function todayIso(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * «همین حالا» برای فیلدهای زمان‌دارِ سرور (مثلِ `paidAt`)، به وقتِ محلی و
 * بدونِ منطقه‌ی زمانی — همان شکلی که سرور خودش زمان‌ها را ذخیره می‌کند
 * (`DateTime.Now`). با `toISOString()` سرور «Z» را دور می‌ریخت و ساعتِ UTC
 * می‌ماند؛ پرداختِ ساعتِ ۱ بامداد به تاریخِ دیروز ثبت می‌شد.
 */
export function nowLocalIso(date = new Date()) {
  return `${todayIso(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
