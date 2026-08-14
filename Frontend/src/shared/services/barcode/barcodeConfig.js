// src/shared/services/barcode/barcodeConfig.js

/**
 * تنظیمات مشترک بارکد برای همه‌ی ماژول‌ها (برچسب کالا، فاکتور، ...).
 *
 * پیش‌فرض CODE128 است: اسکنرهای لیزری انبار و دوربین موبایل هر دو آن را
 * می‌خوانند، کتابخانه‌ی موجود (react-barcode/JsBarcode) بدون افزودن
 * وابستگی جدید آن را می‌سازد و سمت خواندن هم (@zxing و zbar-wasm) از
 * قبل همین را رمزگشایی می‌کند. QR فقط وقتی ارزش دارد که محتوای طولانی
 * یا ساختاریافته رمزگذاری شود؛ شناسه‌ی واحد ما کوتاه است.
 */
export const SYMBOLOGIES = {
  CODE128: "CODE128",
  EAN13: "EAN13",
};

/** اندازه‌های آماده‌ی بارکد روی برچسب. */
export const BARCODE_PRESETS = {
  label: { width: 1.4, height: 38, fontSize: 11, margin: 2 },
  compact: { width: 1, height: 26, fontSize: 9, margin: 1 },
};

export const DEFAULT_SYMBOLOGY = SYMBOLOGIES.CODE128;
