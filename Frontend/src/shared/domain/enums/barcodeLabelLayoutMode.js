// src/shared/domain/enums/barcodeLabelLayoutMode.js

/**
 * `BarcodeLabelLayoutMode` — چیدمانِ صفحه‌ی PDF برچسب در بکند
 * (`Application/Common/Contracts/Documents/DocumentModels.cs`).
 *
 * فقط وقتی معنا دارد که PDF را از سرور می‌گیریم؛ مسیرِ چاپِ مرورگری
 * (`shared/components/print`) هندسه‌ی خودش را از `sheetPresets` دارد.
 */
export const BarcodeLabelLayoutModeEnum = Object.freeze({
  /** شبکه‌ی چندتایی روی کاغذ معمولی (کاغذ برچسبِ A4). */
  SHEET: 1,
  /** هر برچسب یک صفحه، به اندازه‌ی خودِ برچسب (پرینترِ رول حرارتی). */
  ROLL: 2,
});

export const BARCODE_LABEL_LAYOUT_MODE_LABELS = Object.freeze({
  [BarcodeLabelLayoutModeEnum.SHEET]: "شیت A4",
  [BarcodeLabelLayoutModeEnum.ROLL]: "رول حرارتی",
});
