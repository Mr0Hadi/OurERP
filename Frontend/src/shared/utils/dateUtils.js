// src/shared/utils/dateUtils.js

import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import gregorian from "react-date-object/calendars/gregorian";

/** "1403/05/12" → "2024-08-02" (ISO) | خالی → "" */
export function persianToGregorian(persianDateStr) {
  if (!persianDateStr) return "";
  // اگر از قبل ISO میلادی است (مثلاً از PersianDatePicker)، همان را برگردان
  if (/^\d{4}-\d{2}-\d{2}$/.test(persianDateStr)) return persianDateStr;
  try {
    const d = new DateObject({ date: persianDateStr, calendar: persian, format: "YYYY/MM/DD" });
    d.convert(gregorian);
    return d.format("YYYY-MM-DD");
  } catch {
    return "";
  }
}

/**
 * تاریخ جلالی امروز به‌صورت فشرده و بدون جداکننده، برای ساختن شناسه‌هایی
 * مثل کد کالا و بارکد. "YYYYMMDD" → "14050523" و "YYMMDD" → "050523".
 */
export function todayPersianCompact(format = "YYYYMMDD") {
  const d = new DateObject({ calendar: persian });
  return d.format(format);
}

/**
 * "2024-08-02" (ISO) → "1403/05/12" | خالی → ""
 *
 * ورودی می‌تواند timestamp کامل هم باشد ("2024-08-02T10:15:00Z") — همان
 * چیزی که سرور و داده‌های mock واقعاً می‌فرستند. بخش ساعت بریده می‌شود،
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
