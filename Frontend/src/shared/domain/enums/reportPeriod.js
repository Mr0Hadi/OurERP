// src/shared/domain/enums/reportPeriod.js

import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import gregorian from "react-date-object/calendars/gregorian";

/**
 * `ReportPeriodTypeEnum` — بازه‌ی گروه‌بندیِ گزارش (بخش ۱۸ سند
 * api-guide.fa.md). مقادیر باید دقیقاً با اعداد بکند یکی بمانند؛ روی
 * سیم همیشه عدد است.
 *
 * برخلاف بقیه‌ی گزارش‌ها، بکند فقط *یک* endpoint برای فروش و یکی برای
 * خرید دارد و نوع بازه را از همین پارامتر می‌گیرد؛ پس این enum عملاً
 * تنها ورودیِ «سطحِ بزرگ‌نماییِ» داشبورد است.
 */
export const ReportPeriodTypeEnum = Object.freeze({
  DAILY: 0,
  WEEKLY: 1,
  MONTHLY: 2,
  QUARTERLY: 3,
  SEMI_ANNUAL: 4,
  ANNUAL: 5,
});

export const REPORT_PERIOD_LABELS = Object.freeze({
  [ReportPeriodTypeEnum.DAILY]: "روزانه",
  [ReportPeriodTypeEnum.WEEKLY]: "هفتگی",
  [ReportPeriodTypeEnum.MONTHLY]: "ماهانه",
  [ReportPeriodTypeEnum.QUARTERLY]: "فصلی",
  [ReportPeriodTypeEnum.SEMI_ANNUAL]: "شش‌ماهه",
  [ReportPeriodTypeEnum.ANNUAL]: "سالانه",
});

export const REPORT_PERIOD_OPTIONS = Object.entries(REPORT_PERIOD_LABELS).map(
  ([value, label]) => ({ value: Number(value), label }),
);

/**
 * نامِ «یک بازه عقب‌تر» — برای جمله‌ی مقایسه‌ی درصدِ رشد.
 *
 * بدونِ این، کارت‌های بالای داشبورد فقط یک «۲٫۵٪+» نشان می‌دادند و
 * معلوم نبود نسبت به چه. مهم‌تر: عددِ *مجموع* در کارت‌ها با عوض‌کردنِ
 * سطحِ گزارش تغییر نمی‌کند (بازه‌ی تاریخی همان است، فقط بازه‌بندی عوض
 * می‌شود) و تنها چیزی که واقعاً عوض می‌شود همین مبنای مقایسه است.
 */
export const PREVIOUS_PERIOD_LABELS = Object.freeze({
  [ReportPeriodTypeEnum.DAILY]: "روز قبل",
  [ReportPeriodTypeEnum.WEEKLY]: "هفته قبل",
  [ReportPeriodTypeEnum.MONTHLY]: "ماه قبل",
  [ReportPeriodTypeEnum.QUARTERLY]: "فصل قبل",
  [ReportPeriodTypeEnum.SEMI_ANNUAL]: "نیم‌سال قبل",
  [ReportPeriodTypeEnum.ANNUAL]: "سال قبل",
});

/**
 * پیش‌فرضِ بکند وقتی `periodType` نفرستیم — همان‌جا هم ۲ (ماهانه) است.
 * اینجا تکرار می‌شود تا فرانت بتواند بدونِ انتظار برای پاسخِ سرور،
 * برچسبِ درست را نشان دهد.
 */
export const DEFAULT_REPORT_PERIOD = ReportPeriodTypeEnum.MONTHLY;

const QUARTER_NAMES = ["بهار", "تابستان", "پاییز", "زمستان"];

/** ISO میلادی → `DateObject`ِ شمسی، یا `null` اگر ورودی بی‌معنا بود. */
function toPersian(isoDate) {
  if (!isoDate) return null;
  try {
    const dateOnly = String(isoDate).slice(0, 10);
    const d = new DateObject({
      date: dateOnly,
      calendar: gregorian,
      format: "YYYY-MM-DD",
    });
    d.convert(persian);
    d.setLocale(persian_fa);
    return d;
  } catch {
    return null;
  }
}

/**
 * برچسبِ کوتاهِ محورِ زمان.
 *
 * بکند مرزِ بازه‌ها را با تقویمِ شمسی حساب می‌کند ولی `periodStart` را
 * میلادی برمی‌گرداند (بخش ۱۸). پس تبدیل و نام‌گذاری کارِ فرانت است —
 * وگرنه محورِ یک گزارشِ «ماهانه‌ی شمسی» تاریخ‌های میلادیِ وسطِ ماه را
 * نشان می‌دهد و اصلاً روی مرزِ ماه نمی‌افتد.
 */
export function formatPeriodLabel(periodStart, periodType) {
  const d = toPersian(periodStart);
  if (!d) return "";

  const year = d.format("YYYY");
  const shortYear = year.slice(-2);

  switch (Number(periodType)) {
    case ReportPeriodTypeEnum.DAILY:
      return d.format("D MMMM");
    case ReportPeriodTypeEnum.WEEKLY:
      // شروعِ هفته شنبه است؛ همان روز نماینده‌ی کلِ هفته می‌شود.
      return d.format("D MMMM");
    case ReportPeriodTypeEnum.QUARTERLY:
      return `${QUARTER_NAMES[Math.floor((d.month.number - 1) / 3)]} ${shortYear}`;
    case ReportPeriodTypeEnum.SEMI_ANNUAL:
      return `${d.month.number <= 6 ? "نیمه اول" : "نیمه دوم"} ${shortYear}`;
    case ReportPeriodTypeEnum.ANNUAL:
      return year;
    case ReportPeriodTypeEnum.MONTHLY:
    default:
      return `${d.format("MMMM")} ${shortYear}`;
  }
}

/**
 * عنوانِ کاملِ بازه برای حبابِ نمودار و ستونِ جدول.
 *
 * `periodEnd` مرزِ *باز* است (شروعِ بازه‌ی بعدی، همان‌طور که در نمونه‌ی
 * سند دیده می‌شود: ۲۲ ژوئن تا ۲۲ ژوئیه). پس یک روز عقب کشیده می‌شود تا
 * کاربر «۳۱ تیر» ببیند نه «۱ مرداد».
 */
export function formatPeriodRange(periodStart, periodEnd) {
  const start = toPersian(periodStart);
  if (!start) return "";
  if (!periodEnd) return start.format("YYYY/MM/DD");

  const end = toPersian(periodEnd);
  if (!end) return start.format("YYYY/MM/DD");
  end.add(-1, "day");

  return `${start.format("YYYY/MM/DD")} تا ${end.format("YYYY/MM/DD")}`;
}
