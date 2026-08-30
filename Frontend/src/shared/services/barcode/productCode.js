// src/shared/services/barcode/productCode.js

import { persianCompact } from "@/shared/utils/dateUtils";
import { BarcodeReferenceKindEnum } from "@/shared/domain/enums/barcodeReferenceKind";

/**
 * قرینه‌ی دقیقِ `ProductCodeService` بکند
 * (`Infrastructure/Services/ProductCodeService.cs` — سند
 * `docs/product-code-barcode-invoice-design.fa.md`).
 *
 * سه نمایش از یک شناسه وجود دارد و قاطی‌کردنشان منشأ بیشترِ باگ‌های
 * بارکد است:
 *
 * | نام            | مثال                                | کجا |
 * |----------------|-------------------------------------|-----|
 * | کدِ خوانا      | `14050608-0000000010`               | زیر بارکد، جدول‌ها، جست‌وجو |
 * | payload        | `140506080000000010`                | داخلِ خودِ میله‌ها (فقط رقم) |
 * | بارکدِ دانه    | `14050608-0000000010-0000000003`    | روی برچسبِ یک قلمِ فیزیکی |
 *
 * چرا اینجا تکرار شده و از سرور گرفته نمی‌شود: فرانت باید *قبل* از هر
 * رفت‌وبرگشت بفهمد کدِ اسکن‌شده کدِ کالاست یا کدِ یک دانه (تا فرمِ
 * درست را باز کند) و باید بتواند همان کد را روی برچسب رندر کند. این
 * منطق خالص است و اگر با بکند واگرا شود، بارکدِ چاپ‌شده دیگر با چیزی
 * که سرور می‌شناسد یکی نیست — پس هر تغییری اینجا باید *همراهِ* تغییرِ
 * `ProductCodeService` انجام شود.
 */

/** تاریخ جلالیِ فشرده — `PersianDate.ToCompactString`. */
export const DATE_SEGMENT_LENGTH = 8;
/** `productId` با صفرِ چپ — `{productId:D10}` در بکند. */
export const PRODUCT_ID_SEGMENT_LENGTH = 10;
/** شماره‌ی سریالِ دانه با صفرِ چپ — `{serialNumber:D10}`. */
export const SERIAL_SEGMENT_LENGTH = 10;

/** طولِ payloadِ کدِ کالا: ۸ + ۱۰. */
export const PRODUCT_PAYLOAD_LENGTH =
  DATE_SEGMENT_LENGTH + PRODUCT_ID_SEGMENT_LENGTH;

/** طولِ payloadِ بارکدِ دانه: ۸ + ۱۰ + ۱۰. */
export const UNIT_PAYLOAD_LENGTH =
  PRODUCT_PAYLOAD_LENGTH + SERIAL_SEGMENT_LENGTH;

const NON_DIGIT = /\D+/g;

const padSegment = (value, length) =>
  String(Math.max(0, Math.trunc(Number(value) || 0))).padStart(length, "0");

/**
 * هر چیزی که اسکنر یا صفحه‌کلید تولید می‌کند → فقط رقم‌ها.
 *
 * قرینه‌ی `ToPayload`: خط‌تیره‌های نمایشی، فاصله و هر کاراکترِ دیگری
 * حذف می‌شود. همین رشته است که واقعاً داخل میله‌های CODE128 می‌رود و
 * سرور با `BarcodePayload` مقایسه‌اش می‌کند.
 */
export function toPayload(code) {
  return String(code ?? "").replace(NON_DIGIT, "");
}

/**
 * کدِ خوانای کالا: `14050608-0000000010`.
 *
 * بکند این را فقط *بعد* از گرفتنِ `Id` از دیتابیس می‌سازد، پس فرانت
 * هرگز آن را برای ساختِ کالا نمی‌فرستد؛ این تابع برای mock، پیش‌نمایش
 * و بازسازیِ کد از روی بارکدِ دانه است.
 */
export function buildProductCode(productId, createdAt = new Date()) {
  const date = persianCompact(createdAt, "YYYYMMDD");
  if (!date) return "";

  return `${date}-${padSegment(productId, PRODUCT_ID_SEGMENT_LENGTH)}`;
}

/** بارکدِ یک دانه: کدِ کالا + سریالِ صفرپرشده. */
export function buildUnitBarcode(productCode, serialNumber) {
  if (!productCode) return "";

  return `${productCode}-${padSegment(serialNumber, SERIAL_SEGMENT_LENGTH)}`;
}

/**
 * تفسیرِ ورودیِ اسکن — قرینه‌ی `Parse`.
 *
 * تشخیص فقط بر اساسِ *طولِ* رقم‌هاست، دقیقاً مثل بکند: ۱۸ رقم یعنی کدِ
 * کالا، ۲۸ رقم یعنی بارکدِ یک دانه، هر چیز دیگری `UNKNOWN`. شکلِ
 * خروجی هم همان `BarcodeReference` سرور است تا نتیجه‌ی این تابع و
 * پاسخِ `ScanBarcode` در UI یک‌جور مصرف شوند.
 */
export function parseBarcode(scannedInput) {
  const digits = toPayload(scannedInput);

  if (digits.length === PRODUCT_PAYLOAD_LENGTH) {
    return {
      kind: BarcodeReferenceKindEnum.PRODUCT,
      normalizedPayload: digits,
      productId: Number(digits.slice(DATE_SEGMENT_LENGTH)),
      serialNumber: null,
    };
  }

  if (digits.length === UNIT_PAYLOAD_LENGTH) {
    return {
      kind: BarcodeReferenceKindEnum.UNIT,
      normalizedPayload: digits,
      productId: Number(
        digits.slice(DATE_SEGMENT_LENGTH, PRODUCT_PAYLOAD_LENGTH),
      ),
      serialNumber: Number(digits.slice(PRODUCT_PAYLOAD_LENGTH)),
    };
  }

  return {
    kind: BarcodeReferenceKindEnum.UNKNOWN,
    normalizedPayload: digits,
    productId: null,
    serialNumber: null,
  };
}

/**
 * payload → شکلِ خوانا با خط‌تیره.
 *
 * سرور خودش `Barcode` خوانا را ذخیره می‌کند و معمولاً همان مصرف
 * می‌شود؛ این تابع برای جایی است که فقط payload در دست است (مثلاً
 * `normalizedPayload` در پاسخِ اسکن) ولی باید چیزی به کاربر نشان داد.
 * ورودیِ ناشناخته دست‌نخورده برمی‌گردد، چون نمایشِ خامِ چیزی که کاربر
 * اسکن کرده از نمایشِ رشته‌ی خالی مفیدتر است.
 */
export function formatPayload(payload) {
  const digits = toPayload(payload);

  if (digits.length === PRODUCT_PAYLOAD_LENGTH) {
    return `${digits.slice(0, DATE_SEGMENT_LENGTH)}-${digits.slice(DATE_SEGMENT_LENGTH)}`;
  }

  if (digits.length === UNIT_PAYLOAD_LENGTH) {
    return [
      digits.slice(0, DATE_SEGMENT_LENGTH),
      digits.slice(DATE_SEGMENT_LENGTH, PRODUCT_PAYLOAD_LENGTH),
      digits.slice(PRODUCT_PAYLOAD_LENGTH),
    ].join("-");
  }

  return String(payload ?? "");
}

/**
 * کدِ کالا از روی بارکدِ یک دانه.
 *
 * `ProductUnitDto` سرور نه `productCode` دارد و نه `productName`؛ ولی
 * کدِ کالا *داخلِ* بارکدِ دانه است (دو بخشِ اول). پس به‌جای یک
 * درخواستِ اضافه برای هر ردیف، از خودِ بارکد بیرون کشیده می‌شود.
 */
export function productCodeOf(unitBarcode) {
  const digits = toPayload(unitBarcode);
  if (digits.length !== UNIT_PAYLOAD_LENGTH) return "";

  return formatPayload(digits.slice(0, PRODUCT_PAYLOAD_LENGTH));
}
