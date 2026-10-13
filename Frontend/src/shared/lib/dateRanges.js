import DateObject from "react-date-object";
import gregorian from "react-date-object/calendars/gregorian";
import persian from "react-date-object/calendars/persian";

/**
 * بازه‌های آماده‌ی گزارش‌ها و دفترها.
 *
 * چرا لازم است: کاربر تقریباً همیشه یکی از چند بازه‌ی ثابت را می‌خواهد
 * («ماه جاری»، «امسال»، «فصلِ قبل» برای اظهارنامه‌ی مالیات). با دو تقویمِ
 * خالی، هر بار باید هشت کلیک می‌کرد تا «امسال» را بسازد.
 *
 * مرزها **شمسی** حساب می‌شوند (اولِ ماه یعنی اولِ ماهِ شمسی، اولِ سال
 * یعنی فروردین، فصل یعنی سه‌ماهه‌ی شمسی) چون تقویمِ کاری همین است —
 * دقیقاً همان قاعده‌ای که خودِ بکند در گروه‌بندیِ بازه‌های گزارش دارد
 * (بخش ۱۸ سند). خروجی اما ISOِ میلادی است، چون همان چیزی است که روی سیم
 * می‌رود و `PersianDatePicker` هم می‌گیرد.
 */

const todayPersian = () =>
  new DateObject({ date: new Date(), calendar: gregorian }).convert(persian);

const toISO = (dateObject) => dateObject.convert(gregorian).format("YYYY-MM-DD");

/** امروز به‌صورت ISO — انتهای بازه‌های «تا امروز». */
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

/** ماهِ شمسیِ قبل، کامل (اول تا آخرِ ماه). */
function previousPersianMonth() {
  const end = todayPersian();
  end.setDay(1).subtract(1, "day");
  const start = new DateObject(end).setDay(1);
  return { fromDate: toISO(start), toDate: toISO(end) };
}

/** اولِ فصلِ (سه‌ماهه‌ی) شمسیِ جاری. */
function startOfPersianQuarter() {
  const date = todayPersian();
  const firstMonth = Math.floor((date.month.number - 1) / 3) * 3 + 1;
  date.setMonth(firstMonth).setDay(1);
  return toISO(date);
}

/** فصلِ شمسیِ قبل، کامل — بازه‌ی اظهارنامه‌ی ارزش افزوده. */
function previousPersianQuarter() {
  const end = todayPersian();
  const firstMonth = Math.floor((end.month.number - 1) / 3) * 3 + 1;
  end.setMonth(firstMonth).setDay(1).subtract(1, "day");
  const start = new DateObject(end);
  start.setMonth(start.month.number - 2).setDay(1);
  return { fromDate: toISO(start), toDate: toISO(end) };
}

/** اولِ فروردینِ سالِ شمسیِ جاری. */
function startOfPersianYear() {
  const date = todayPersian();
  date.setMonth(1).setDay(1);
  return toISO(date);
}

/** سالِ شمسیِ قبل، کامل. */
function previousPersianYear() {
  const start = todayPersian();
  start.setYear(start.year - 1).setMonth(1).setDay(1);
  const end = todayPersian();
  end.setMonth(1).setDay(1).subtract(1, "day");
  return { fromDate: toISO(start), toDate: toISO(end) };
}

const EMPTY_RANGE = () => ({ fromDate: "", toDate: "" });

/** همه‌ی بازه‌های آماده؛ هر صفحه زیرمجموعه‌ای را که به کارش می‌آید برمی‌دارد. */
const PRESETS = {
  month: { id: "month", label: "ماه جاری", range: () => ({ fromDate: startOfPersianMonth(), toDate: today() }) },
  previousMonth: { id: "previousMonth", label: "ماه قبل", range: previousPersianMonth },
  "90days": { id: "90days", label: "۹۰ روز اخیر", range: () => ({ fromDate: daysAgo(89), toDate: today() }) },
  quarter: { id: "quarter", label: "فصل جاری", range: () => ({ fromDate: startOfPersianQuarter(), toDate: today() }) },
  previousQuarter: { id: "previousQuarter", label: "فصل قبل", range: previousPersianQuarter },
  year: { id: "year", label: "سال جاری", range: () => ({ fromDate: startOfPersianYear(), toDate: today() }) },
  previousYear: { id: "previousYear", label: "سال قبل", range: previousPersianYear },
};

/**
 * `""` یعنی «بدونِ بازه» — نه یک تاریخِ خیلی قدیمی. سرور با نبودِ
 * `fromDate`/`toDate` همه‌ی سوابق را می‌دهد و ساختنِ یک بازه‌ی جعلیِ
 * «از ۱۳۰۰» فقط داده را بی‌دلیل محدود می‌کرد.
 */
export const RANGE_PRESETS = Object.freeze([
  { id: "all", label: "همه", range: EMPTY_RANGE },
  PRESETS.month,
  PRESETS["90days"],
  PRESETS.year,
]);

/**
 * برای endpointهایی که بازه‌ی خالی را «دوازده ماهِ اخیر» می‌فهمند (داشبوردِ
 * حسابداری، گزارشِ مالیات) — نه «همه». برچسبِ گزینه‌ی خالی همان چیزی را
 * می‌گوید که سرور واقعاً برمی‌گرداند.
 */
export const TWELVE_MONTH_RANGE_PRESETS = Object.freeze([
  { id: "default", label: "۱۲ ماه اخیر", range: EMPTY_RANGE },
  PRESETS.month,
  PRESETS.previousMonth,
  PRESETS.quarter,
  PRESETS.previousQuarter,
  PRESETS.year,
  PRESETS.previousYear,
]);

/** دفترهای حسابداری: «همه» به‌اضافه‌ی بازه‌های تقویمیِ کامل. */
export const LEDGER_RANGE_PRESETS = Object.freeze([
  { id: "all", label: "همه", range: EMPTY_RANGE },
  PRESETS.month,
  PRESETS.previousMonth,
  PRESETS.quarter,
  PRESETS.previousQuarter,
  PRESETS.year,
  PRESETS.previousYear,
]);

/**
 * کدام دکمه‌ی آماده «روشن» است.
 *
 * با مقایسه‌ی خودِ تاریخ‌ها حساب می‌شود، نه با نگه‌داشتنِ یک
 * `activePreset` در استور: بازه می‌تواند از هر جای دیگری هم عوض شود
 * (تقویمِ دستی، ریست) و آن‌وقت دو منبعِ حقیقت پیدا می‌کردیم که از هم
 * جدا می‌افتند.
 */
export function matchPreset({ fromDate, toDate }, presets = RANGE_PRESETS) {
  return (
    presets.find((preset) => {
      const range = preset.range();
      return range.fromDate === (fromDate || "") && range.toDate === (toDate || "");
    })?.id ?? null
  );
}
