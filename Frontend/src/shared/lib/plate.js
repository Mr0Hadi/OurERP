// ثابت‌ها و تبدیل‌های پلاک خودرو.
// جدا از کامپوننت PlateInput نگه داشته شده‌اند تا فایل کامپوننت فقط کامپوننت
// export کند (شرط Fast Refresh) و فرم‌ها بدون وابستگی به UI از آن‌ها استفاده کنند.

/** Value used for the accessibility (wheelchair) plate option. */
export const DISABLED_PLATE_LETTER = "معلولان"

/** Every plate letter the picker offers — the same set and order AZKI uses. */
export const PLATE_LETTERS = [
  { value: "ا", label: "الف" },
  { value: "ب", label: "ب" },
  { value: "پ", label: "پ" },
  { value: "ت", label: "ت" },
  { value: "ث", label: "ث" },
  { value: "ج", label: "ج" },
  { value: "ح", label: "ح" },
  { value: "د", label: "د" },
  { value: "ر", label: "ر" },
  { value: "ز", label: "ز" },
  { value: "ژ", label: "ژ" },
  { value: "س", label: "س" },
  { value: "ش", label: "ش" },
  { value: "ص", label: "ص" },
  { value: "ض", label: "ض" },
  { value: "ط", label: "ط" },
  { value: "ظ", label: "ظ" },
  { value: "ع", label: "ع" },
  { value: "ف", label: "ف" },
  { value: "ق", label: "ق" },
  { value: "ک", label: "ک" },
  { value: "گ", label: "گ" },
  // Latin-lettered special plates (diplomatic / service types).
  { value: "D", label: "D" },
  { value: "S", label: "S" },
]

/**
 * The value an untouched PlateInput holds — letter defaults to الف ("ا").
 * Seed controlled state with this so external mirrors stay in sync from
 * the first render.
 */
export const DEFAULT_PLATE_VALUE = {
  twoDigit: "",
  letter: "ا",
  threeDigit: "",
  serial: "",
}

const PLATE_STRING_SEPARATOR = "|";

/**
 * پلاک به‌صورت رشته ذخیره می‌شود (برای فرم و ارسال به سرور)، اما
 * PlateInput مقدارش را به‌صورت آبجکت می‌خواهد. این دو تابع بین آن دو
 * تبدیل می‌کنند؛ مقادیر نصفه‌کاره هم حفظ می‌شوند تا تایپ کاربر گم نشود.
 */
export function plateValueToString({ twoDigit, letter, threeDigit, serial }) {
  if (!twoDigit && !threeDigit && !serial) return "";
  return [twoDigit, letter, threeDigit, serial].join(PLATE_STRING_SEPARATOR);
}

export function plateStringToValue(value) {
  if (!value) return DEFAULT_PLATE_VALUE;
  const [twoDigit = "", letter = "", threeDigit = "", serial = ""] =
    value.split(PLATE_STRING_SEPARATOR);
  return { twoDigit, letter, threeDigit, serial };
}
