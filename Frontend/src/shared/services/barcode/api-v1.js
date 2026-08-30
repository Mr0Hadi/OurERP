// src/shared/services/barcode/api-v1.js

import axiosInstance from "@/shared/services/api/axios";
import { BarcodeLabelLayoutModeEnum } from "@/shared/domain/enums/barcodeLabelLayoutMode";

/**
 * لایه‌ی تماس با `api/Barcode` (بخش ۸ سند api-guide.fa.md).
 *
 * سه نکته‌ی قرارداد:
 *
 * ۱. برخلافِ بقیه‌ی سیستم، این endpointها پوششِ `ResponseDto` ندارند و
 *    مستقیماً *فایل* برمی‌گردانند (`image/svg+xml` یا `application/pdf`)
 *    — پس `responseType: "blob"`.
 * ۲. خطا همچنان JSONِ استاندارد است، ولی چون responseType بلاب است،
 *    اینترسپتورِ axios نمی‌تواند پیامِ فارسی را بیرون بکشد؛ این کار
 *    اینجا انجام می‌شود (`unwrapBlobError`).
 * ۳. `code` باید یک کدِ *ازقبل‌موجود* باشد (`Product.BarCode` یا
 *    `ProductUnit.Barcode`)؛ سرور فقط رندر می‌کند و چیزی نمی‌سازد.
 */

/** مقادیر پیش‌فرضِ چیدمان — عیناً همان پیش‌فرض‌های `GetProductLabelsPdfQuery`. */
export const LABEL_LAYOUT_DEFAULTS = Object.freeze({
  mode: BarcodeLabelLayoutModeEnum.SHEET,
  columns: 3,
  rows: 10,
  labelWidthMm: 48,
  labelHeightMm: 25,
  showProductName: true,
  showPrice: false,
});

/**
 * بدنه‌ی خطا با `responseType: "blob"` خودش یک Blob است، پس
 * `error.response.data.Message` وجود ندارد و کاربر پیامِ عمومیِ axios
 * را می‌بیند. اینجا بلاب خوانده و پیامِ سرور به `error.message`
 * برگردانده می‌شود — همان کاری که اینترسپتور برای پاسخ‌های JSON می‌کند.
 */
async function unwrapBlobError(error) {
  const body = error?.response?.data;
  if (!(body instanceof Blob)) throw error;

  try {
    const parsed = JSON.parse(await body.text());
    const message = parsed?.Message ?? parsed?.message ?? parsed?.title;
    if (message) error.message = message;
  } catch {
    // بدنه‌ی غیر JSON (مثلاً صفحه‌ی خطای پروکسی) — پیامِ خودِ axios می‌ماند.
  }

  throw error;
}

async function fetchFile(url, params, { signal } = {}) {
  try {
    const { data } = await axiosInstance.get(url, {
      params,
      responseType: "blob",
      signal,
      // ساختِ PDF چند صد برچسبی از تایم‌اوتِ ۱۵ ثانیه‌ایِ پیش‌فرض
      // بیشتر طول می‌کشد.
      timeout: 60000,
    });
    return data;
  } catch (error) {
    return unwrapBlobError(error);
  }
}

const layoutParams = (options = {}) => {
  const layout = { ...LABEL_LAYOUT_DEFAULTS, ...options };

  return {
    mode: layout.mode,
    columns: layout.columns,
    rows: layout.rows,
    labelWidthMm: layout.labelWidthMm,
    labelHeightMm: layout.labelHeightMm,
    showProductName: layout.showProductName,
    showPrice: layout.showPrice,
  };
};

/**
 * `GET api/Barcode/GetBarcodeSvg` — رندرِ وکتورِ یک کدِ مشخص.
 *
 * فرانت بارکد را معمولاً خودش (JsBarcode) رندر می‌کند و به این نیازی
 * ندارد؛ این مسیر برای جایی است که باید *دقیقاً* همان تصویری را نشان
 * داد که سرور روی PDF می‌گذارد.
 *
 * @returns Blob با `image/svg+xml`
 */
export const getBarcodeSvg = (code, options = {}) =>
  fetchFile(
    "/Barcode/GetBarcodeSvg",
    {
      code,
      moduleWidthMm: options.moduleWidthMm,
      barHeightMm: options.barHeightMm,
      showHumanReadable: options.showHumanReadable,
    },
    options,
  );

/**
 * `GET api/Barcode/GetProductLabelsPdf` — یک برچسب به‌ازای هر دانه‌ی
 * فیزیکی، نه یک برچسب برای کلِ تعداد.
 *
 * `status` پیش‌فرضِ سمتِ سرور `IN_STOCK` است؛ `fromSerial`/`toSerial`
 * برای محدودکردن به دانه‌های یک بارِ دریافتِ خاص است (سریال‌ها per-product
 * پشتِ‌سرهم زده می‌شوند، پس «همین باری که رسید» یک بازه‌ی پیوسته است).
 *
 * @returns Blob با `application/pdf`
 */
export const getProductLabelsPdf = ({
  productId,
  status,
  fromSerial,
  toSerial,
  ...options
} = {}) =>
  fetchFile(
    "/Barcode/GetProductLabelsPdf",
    { productId, status, fromSerial, toSerial, ...layoutParams(options) },
    options,
  );

/**
 * `GET api/Barcode/GetPurchaseReceivingLabelsPdf` — دکمه‌ی «چاپ برچسبِ
 * این خرید» در اسکله‌ی دریافت.
 *
 * فقط دانه‌های *صحیحِ* دریافت‌شده را می‌آورد: اقلامِ کسری/آسیب‌دیده/مازاد
 * اصلاً دانه‌ای نمی‌سازند، پس فیلترِ سرور روی `PurchaseItemId` خودبه‌خود
 * آن‌ها را کنار می‌گذارد.
 *
 * @returns Blob با `application/pdf`
 */
export const getPurchaseReceivingLabelsPdf = ({
  purchaseId,
  fromSerial,
  toSerial,
  ...options
} = {}) =>
  fetchFile(
    "/Barcode/GetPurchaseReceivingLabelsPdf",
    { purchaseId, fromSerial, toSerial, ...layoutParams(options) },
    options,
  );
