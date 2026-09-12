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
 * چرا از سرور گرفته نمی‌شود: فرانت باید *قبل* از هر رفت‌وبرگشت بفهمد
 * کدِ اسکن‌شده کدِ کالاست یا کدِ یک دانه، تا فرمِ درست را باز کند.
 *
 * ⚠️ هر تغییری اینجا باید *همراهِ* تغییرِ `ProductCodeService` انجام
 * شود؛ واگرایی یعنی بارکدِ چاپ‌شده دیگر با آنچه سرور می‌شناسد یکی نیست.
 */

/** تاریخ جلالیِ فشرده — `PersianDate.ToCompactString`. */
const DATE_SEGMENT_LENGTH = 8;
/** `productId` با صفرِ چپ — `{productId:D10}` در بکند. */
const PRODUCT_ID_SEGMENT_LENGTH = 10;
/** شماره‌ی سریالِ دانه با صفرِ چپ — `{serialNumber:D10}`. */
const SERIAL_SEGMENT_LENGTH = 10;

/** طولِ payloadِ کدِ کالا: ۸ + ۱۰. */
const PRODUCT_PAYLOAD_LENGTH =
  DATE_SEGMENT_LENGTH + PRODUCT_ID_SEGMENT_LENGTH;

/** طولِ payloadِ بارکدِ دانه: ۸ + ۱۰ + ۱۰. */
const UNIT_PAYLOAD_LENGTH =
  PRODUCT_PAYLOAD_LENGTH + SERIAL_SEGMENT_LENGTH;

const NON_DIGIT = /\D+/g;

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
 * همان بخش‌هایی که `formatPayload` با خط‌تیره به هم می‌چسباند، این‌بار
 * جدا از هم: `["14050608", "0000000010", "0000000003"]`.
 *
 * برای جایی است که کد باید در چند سطر شکسته شود چون در یک سطر جا
 * نمی‌شود (برچسبِ باریکِ رول حرارتی). شکستن از روی همین مرزهای معنادار
 * انجام می‌شود نه از روی عرضِ ظرف، وگرنه رقم‌ها وسطِ یک بخش می‌شکنند و
 * کسی که برچسب را با چشم می‌خواند نمی‌فهمد کجای کد است.
 *
 * ورودیِ ناشناخته یک تکه برمی‌گردد — به همان دلیلِ `formatPayload`:
 * نمایشِ خامِ چیزی که در دست است از نمایشِ هیچ بهتر است.
 */
export function barcodeSegments(code) {
  const digits = toPayload(code);

  if (digits.length === PRODUCT_PAYLOAD_LENGTH) {
    return [digits.slice(0, DATE_SEGMENT_LENGTH), digits.slice(DATE_SEGMENT_LENGTH)];
  }

  if (digits.length === UNIT_PAYLOAD_LENGTH) {
    return [
      digits.slice(0, DATE_SEGMENT_LENGTH),
      digits.slice(DATE_SEGMENT_LENGTH, PRODUCT_PAYLOAD_LENGTH),
      digits.slice(PRODUCT_PAYLOAD_LENGTH),
    ];
  }

  return [String(code ?? "")];
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
  return barcodeSegments(payload).join("-");
}

/**
 * کدِ کالا از روی بارکدِ یک دانه.
 *
 * `ProductUnitDto` سرور `productCode` ندارد؛ ولی
 * کدِ کالا *داخلِ* بارکدِ دانه است (دو بخشِ اول). پس به‌جای یک
 * درخواستِ اضافه برای هر ردیف، از خودِ بارکد بیرون کشیده می‌شود.
 */
export function productCodeOf(unitBarcode) {
  const digits = toPayload(unitBarcode);
  if (digits.length !== UNIT_PAYLOAD_LENGTH) return "";

  return formatPayload(digits.slice(0, PRODUCT_PAYLOAD_LENGTH));
}
