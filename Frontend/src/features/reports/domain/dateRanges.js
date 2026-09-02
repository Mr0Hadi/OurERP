// src/features/reports/domain/dateRanges.js
import DateObject from "react-date-object";
import gregorian from "react-date-object/calendars/gregorian";
import persian from "react-date-object/calendars/persian";

/**
 * بازه‌های آماده‌ی گزارش.
 *
 * چرا لازم است: تنها فیلترِ این گزارش‌ها بازه‌ی تاریخ است و کاربر تقریباً
 * همیشه یکی از همین چهار بازه را می‌خواهد. با دو تقویمِ خالی، هر بار
 * باید هشت کلیک می‌کرد تا «امسال» را بسازد.
 *
 * مرزها **شمسی** حساب می‌شوند (اولِ ماه یعنی اولِ ماهِ شمسی، اولِ سال
 * یعنی فروردین) چون تقویمِ کاری همین است — دقیقاً همان قاعده‌ای که
 * خودِ بکند در گروه‌بندیِ بازه‌های گزارش دارد (بخش ۱۸ سند). خروجی اما
 * ISOِ میلادی است، چون همان چیزی است که روی سیم می‌رود و
 * `PersianDatePicker` هم می‌گیرد.
 */

const todayPersian = () =>
  new DateObject({ date: new Date(), calendar: gregorian }).convert(persian);

const toISO = (dateObject) => dateObject.convert(gregorian).format("YYYY-MM-DD");

/** امروز به‌صورت ISO — انتهای همه‌ی بازه‌ها. */
const today = () => toISO(todayPersian());

/** n روز قبل از امروز. */
function daysAgo(count) {
  const date = todayPersian();
  date.subtract(count, "days");
  return toISO(date);
}

/** اولِ ماهِ شمسیِ جاری. */
function startOfPersianMonth() {
  const date = todayPersian();
  date.setDay(1);
  return toISO(date);
}

/** اولِ فروردینِ سالِ شمسیِ جاری. */
function startOfPersianYear() {
  const date = todayPersian();
  date.setMonth(1).setDay(1);
  return toISO(date);
}

/**
 * `null` یعنی «بدونِ بازه» — نه یک تاریخِ خیلی قدیمی. سرور با نبودِ
 * `fromDate`/`toDate` همه‌ی سوابق را می‌دهد و ساختنِ یک بازه‌ی جعلیِ
 * «از ۱۳۰۰» فقط داده را بی‌دلیل محدود می‌کرد.
 */
export const RANGE_PRESETS = Object.freeze([
  { id: "all", label: "همه", range: () => ({ fromDate: "", toDate: "" }) },
  {
    id: "month",
    label: "ماه جاری",
    range: () => ({ fromDate: startOfPersianMonth(), toDate: today() }),
  },
  {
    id: "90days",
    label: "۹۰ روز اخیر",
    range: () => ({ fromDate: daysAgo(89), toDate: today() }),
  },
  {
    id: "year",
    label: "سال جاری",
    range: () => ({ fromDate: startOfPersianYear(), toDate: today() }),
  },
]);

/**
 * کدام دکمه‌ی آماده «روشن» است.
 *
 * با مقایسه‌ی خودِ تاریخ‌ها حساب می‌شود، نه با نگه‌داشتنِ یک
 * `activePreset` در استور: بازه می‌تواند از هر جای دیگری هم عوض شود
 * (تقویمِ دستی، ریست) و آن‌وقت دو منبعِ حقیقت پیدا می‌کردیم که از هم
 * جدا می‌افتند.
 */
export function matchPreset({ fromDate, toDate }) {
  return (
    RANGE_PRESETS.find((preset) => {
      const range = preset.range();
      return range.fromDate === (fromDate || "") && range.toDate === (toDate || "");
    })?.id ?? null
  );
}
