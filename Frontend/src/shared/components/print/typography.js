/**
 * اندازه‌ی متنِ برگه‌های چاپی. برگه اندازه‌ی پایه را روی ریشه می‌گذارد و
 * بقیه‌ی متن‌ها نسبت به آن (`em`) هستند، پس یک انتخاب همه را با هم بزرگ/کوچک
 * می‌کند. واحد pt است چون کاغذ است، نه صفحه‌نمایش.
 */
export const TEXT_SCALES = Object.freeze({ SMALL: "small", MEDIUM: "medium", LARGE: "large" });

export const TEXT_SCALE_LABELS = Object.freeze({
  [TEXT_SCALES.SMALL]: "کوچک",
  [TEXT_SCALES.MEDIUM]: "متوسط",
  [TEXT_SCALES.LARGE]: "بزرگ",
});

const BASE_FONT_PT = Object.freeze({
  [TEXT_SCALES.SMALL]: 8,
  [TEXT_SCALES.MEDIUM]: 9.5,
  [TEXT_SCALES.LARGE]: 11,
});

/** اندازه‌ی پایه‌ی متن (pt)؛ مقدارِ ناشناخته = متوسط. */
export const baseFontPt = (scale) => BASE_FONT_PT[scale] ?? BASE_FONT_PT[TEXT_SCALES.MEDIUM];
