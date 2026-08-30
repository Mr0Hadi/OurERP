// src/shared/services/barcode/barcodeConfig.js

/**
 * تنظیمات مشترک بارکد برای همه‌ی ماژول‌ها (برچسب کالا، فاکتور، ...).
 *
 * پیش‌فرض CODE128 است: اسکنرهای لیزری انبار و دوربین موبایل هر دو آن را
 * می‌خوانند، کتابخانه‌ی موجود (react-barcode/JsBarcode) بدون افزودن
 * وابستگی جدید آن را می‌سازد و سمت خواندن هم (@zxing و zbar-wasm) از
 * قبل همین را رمزگشایی می‌کند. QR فقط وقتی ارزش دارد که محتوای طولانی
 * یا ساختاریافته رمزگذاری شود؛ شناسه‌ی واحد ما کوتاه است.
 *
 * بکند هم دقیقاً همین را انتخاب کرده (`ZXingBarcodeRenderer` فقط
 * `RenderCode128Svg` را برای برچسب‌ها به کار می‌برد)، پس بارکدی که
 * مرورگر چاپ می‌کند و بارکدی که PDF سرور می‌سازد یک چیزند.
 */
export const SYMBOLOGIES = {
  CODE128: "CODE128",
  EAN13: "EAN13",
};

/**
 * هندسه‌ی رندرِ سرور، برای وقتی که از `GetBarcodeSvg`/`GetProductLabelsPdf`
 * تصویر می‌گیریم — پیش‌فرض‌های `BarcodeRenderOptions` بکند.
 *
 * `moduleWidthMm` را پایین‌تر از ۰٫۲۵ نبرید: باریک‌ترین میله زیر آن
 * حد، روی پرینترِ ۲۰۳dpi انبار دیگر خوانده نمی‌شود.
 */
export const SERVER_RENDER_DEFAULTS = Object.freeze({
  moduleWidthMm: 0.33,
  barHeightMm: 12,
  showHumanReadable: true,
});

/**
 * اندازه‌های آماده‌ی بارکد روی برچسب.
 *
 * `width` تعدادِ پیکسل به‌ازای هر ماژول است (قرارداد JsBarcode)، نه
 * میلی‌متر؛ اندازه‌ی نهایی را عرضِ ظرف تعیین می‌کند چون SVG مقیاس
 * می‌گیرد. نسبت‌ها طوری انتخاب شده‌اند که payloadِ ۲۸ رقمیِ دانه هم در
 * برچسبِ استاندارد جا شود.
 */
export const BARCODE_PRESETS = {
  label: { width: 1.4, height: 38, fontSize: 11, margin: 2 },
  compact: { width: 1, height: 26, fontSize: 9, margin: 1 },
  /** پیش‌نمایشِ بزرگ روی صفحه (فرم کالا، شیت جزئیات دانه). */
  display: { width: 1.5, height: 60, fontSize: 14, margin: 5 },
};

export const DEFAULT_SYMBOLOGY = SYMBOLOGIES.CODE128;
