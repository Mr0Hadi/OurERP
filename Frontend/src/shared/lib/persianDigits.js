const persianAndArabicDigits = {
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
}

/** Persian keyboards commonly type ۰-۹ (or Arabic-Indic ٠-٩) instead of 0-9. */
export function normalizePersianDigits(value) {
  return value.replace(/[۰-۹٠-٩]/g, (char) => persianAndArabicDigits[char] ?? char);
}

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/**
 * ارقامِ لاتینِ یک متن → فارسی، بی‌آنکه متن عدد فرض شود: صفرِ اولِ شناسه‌ی ملی و کدِ پستی، خط‌تیره‌ی
 * شماره‌ی سند (`INV-1405-0012`) و حروف دست‌نخورده می‌مانند. برای عددِ مقداری `formatNumber` را بخواهید.
 */
export function toPersianDigits(value) {
  if (value == null) return "";
  return String(value).replace(/[0-9]/g, (digit) => PERSIAN_DIGITS[digit]);
}
