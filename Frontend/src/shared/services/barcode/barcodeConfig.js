// src/shared/services/barcode/barcodeConfig.js

/**
 * تنظیمات مشترک بارکد برای همه‌ی ماژول‌ها (برچسب کالا، فاکتور، ...).
 *
 * پیش‌فرض CODE128 است: اسکنرهای لیزری انبار و دوربین موبایل هر دو آن را
 * می‌خوانند، کتابخانه‌ی موجود (react-barcode/JsBarcode) بدون افزودن
 * وابستگی جدید آن را می‌سازد و سمت خواندن هم (@zxing و zbar-wasm) از
 * قبل همین را رمزگشایی می‌کند.
 *
 * QR جایگزینِ آن نیست، مکملش است: همان payloadِ رقمی را نگه می‌دارد ولی
 * چون دوبعدی است، دوربینِ موبایل از زاویه و فاصله‌ی بازتری می‌خواندش.
 * پس هر جا هر دو نماد ساخته می‌شوند (`BarcodeGraphic` و
 * `QrCodeGraphic`) محتوایشان باید *یکی* باشد، وگرنه یک برچسب بسته به
 * اینکه با چه چیزی اسکن شود دو جواب می‌دهد.
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

/**
 * اندازه‌های آماده‌ی QR — قرینه‌ی `BARCODE_PRESETS`.
 *
 * `size` عرضِ پیشنهادیِ SVG بر حسبِ پیکسل است و `margin` پهنای ناحیه‌ی
 * سفیدِ دورِ کد بر حسبِ ماژول. حاشیه را زیر ۲ ماژول نبرید: اسکنر بدون
 * ناحیه‌ی آرام، لبه‌ی کد را پیدا نمی‌کند.
 */
export const QR_PRESETS = {
  label: { size: 96, fontSize: 8, margin: 2 },
  compact: { size: 64, fontSize: 7, margin: 2 },
  /** پیش‌نمایشِ بزرگ روی صفحه (کارت بارکدِ کالا). */
  display: { size: 176, fontSize: 12, margin: 3 },
};

/**
 * سطح تصحیحِ خطا برای QR.
 *
 * `M` (~۱۵٪) تعادلِ متعارف است: برچسبِ خط‌خورده یا کمی کثیف هنوز خوانده
 * می‌شود و کد هم آن‌قدر بزرگ نمی‌شود که روی برچسبِ انبار جا نشود.
 */
export const QR_ERROR_CORRECTION = "M";

/**
 * روی برچسب کدام نماد چاپ شود.
 *
 * این یک enum بکندی نیست و عمداً هم نباید بشود: سرور فقط `payload` را
 * می‌شناسد و هر دو نماد همان را حمل می‌کنند، پس این صرفاً یک ترجیحِ
 * چاپِ سمتِ مرورگر است — مثل انتخابِ اندازه‌ی ورق.
 *
 * انتخاب بین این دو به دستگاهِ انبار برمی‌گردد نه سلیقه: اسکنرِ لیزریِ
 * دستی فقط بارکدِ خطی می‌خواند، ولی دوربینِ موبایل QR را از زاویه و
 * فاصله‌ی بازتری می‌گیرد.
 */
export const LABEL_CODE_KINDS = Object.freeze({
  BARCODE: "barcode",
  QR: "qr",
});

export const DEFAULT_LABEL_CODE_KIND = LABEL_CODE_KINDS.BARCODE;

export const LABEL_CODE_KIND_OPTIONS = Object.freeze([
  { value: LABEL_CODE_KINDS.BARCODE, label: "بارکد خطی (CODE128)" },
  { value: LABEL_CODE_KINDS.QR, label: "کد QR" },
]);
