// src/shared/components/print/sheetPresets.js

/**
 * هندسه‌ی صفحه‌ی چاپ برچسب — همه بر حسب میلی‌متر.
 *
 * اندازه‌ها باید واقعاً داخل محدوده‌ی چاپ جا شوند، وگرنه ستون یا ردیف
 * آخر بی‌صدا از صفحه بیرون می‌افتد:
 *   عرض مفید  = عرض کاغذ  - ۲×حاشیه
 *   ارتفاع مفید = ارتفاع کاغذ - ۲×حاشیه
 *   columns×labelWidth  + (columns-1)×gap ≤ عرض مفید
 *   rows×labelHeight    + (rows-1)×gap    ≤ ارتفاع مفید
 *
 * perPage از columns×rows حساب می‌شود تا هیچ‌وقت با هندسه ناسازگار نشود.
 */
const A4 = { widthMm: 210, heightMm: 297 };

const buildPreset = (preset) => ({
  ...preset,
  perPage: preset.columns * preset.rows,
});

export const SHEET_PRESETS = {
  // ۳×۸ روی A4: ۱۹۰ ≤ ۱۹۴ و ۲۷۸ ≤ ۲۸۱ — چند میلی‌متر فاصله‌ی امن
  // عمدی است، چون حاشیه‌ی واقعی پرینترها کمی با هم فرق می‌کند.
  "a4-3x8": buildPreset({
    label: "A4 — ۲۴ برچسب (۶۲×۳۳ میلی‌متر)",
    pageSize: "A4",
    pageWidthMm: A4.widthMm,
    pageHeightMm: A4.heightMm,
    pageMarginMm: 8,
    columns: 3,
    rows: 8,
    labelWidthMm: 62,
    labelHeightMm: 33,
    gapMm: 2,
  }),
  // ۲×۵ روی A4: ۱۸۹ ≤ ۱۹۰ و ۲۷۷ ≤ ۲۷۷
  "a4-2x5": buildPreset({
    label: "A4 — ۱۰ برچسب (۹۳×۵۳ میلی‌متر)",
    pageSize: "A4",
    pageWidthMm: A4.widthMm,
    pageHeightMm: A4.heightMm,
    pageMarginMm: 10,
    columns: 2,
    rows: 5,
    labelWidthMm: 93,
    labelHeightMm: 53,
    gapMm: 3,
  }),
  // برای پرینتر حرارتی رول؛ هر برچسب یک صفحه است.
  "thermal-50x30": buildPreset({
    label: "رول حرارتی — ۵۰×۳۰ میلی‌متر",
    pageSize: "50mm 30mm",
    pageWidthMm: 50,
    pageHeightMm: 30,
    pageMarginMm: 1,
    columns: 1,
    rows: 1,
    labelWidthMm: 48,
    labelHeightMm: 28,
    gapMm: 0,
  }),
};

export const DEFAULT_SHEET_PRESET = "a4-3x8";

export const SHEET_PRESET_OPTIONS = Object.entries(SHEET_PRESETS).map(
  ([value, preset]) => ({ value, label: preset.label }),
);

export const getSheetPreset = (key) =>
  SHEET_PRESETS[key] ?? SHEET_PRESETS[DEFAULT_SHEET_PRESET];

/** تقسیم صریح آیتم‌ها به صفحه‌ها — به شکست خودکار مرورگر تکیه نمی‌کنیم. */
export const paginateItems = (items, preset) => {
  const pages = [];
  for (let i = 0; i < items.length; i += preset.perPage) {
    pages.push(items.slice(i, i + preset.perPage));
  }
  return pages;
};
