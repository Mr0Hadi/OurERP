// src/shared/components/print/sheetPresets.js

/**
 * هندسه‌ی صفحه‌ی چاپ برچسب.
 *
 * همه‌چیز بر حسب میلی‌متر است تا خروجی چاپ اندازه‌ی فیزیکی درست داشته
 * باشد. افزودن پشتیبانی از پرینتر حرارتی در آینده یعنی اضافه‌کردن یک
 * preset تازه به همین شیء — نه بازنویسی ماژول.
 */
export const SHEET_PRESETS = {
  "a4-3x8": {
    label: "A4 — ۲۴ برچسب (۷۰×۳۷ میلی‌متر)",
    pageSize: "A4",
    pageMarginMm: 8,
    columns: 3,
    labelWidthMm: 70,
    labelHeightMm: 37,
    gapMm: 2,
    perPage: 24,
  },
  "a4-2x5": {
    label: "A4 — ۱۰ برچسب (۹۹×۵۷ میلی‌متر)",
    pageSize: "A4",
    pageMarginMm: 10,
    columns: 2,
    labelWidthMm: 99,
    labelHeightMm: 57,
    gapMm: 3,
    perPage: 10,
  },
  // برای پرینتر حرارتی رول؛ هنوز پرینتری انتخاب نشده و این preset صرفاً
  // نشان می‌دهد افزودنش چقدر کم‌هزینه است.
  "thermal-50x30": {
    label: "رول حرارتی — ۵۰×۳۰ میلی‌متر",
    pageSize: "50mm 30mm",
    pageMarginMm: 1,
    columns: 1,
    labelWidthMm: 48,
    labelHeightMm: 28,
    gapMm: 0,
    perPage: 1,
  },
};

export const DEFAULT_SHEET_PRESET = "a4-3x8";

export const SHEET_PRESET_OPTIONS = Object.entries(SHEET_PRESETS).map(
  ([value, preset]) => ({ value, label: preset.label }),
);
