import { BarcodeReferenceKindEnum } from "@/shared/domain/enums/barcodeReferenceKind";
import { normalizePersianDigits } from "@/shared/lib/persianDigits";

/**
 * قرینه‌ی `ProductCodeService` بکند
 * (`Infrastructure/Services/ProductCodeService.cs` — سند
 * `docs/product-code-barcode-invoice-design.fa.md`).
 *
 * هر کد از بخش‌هایی ساخته شده که با `-` از هم جدا می‌شوند. خودِ خط‌تیره
 * هم داخلِ نماد (میله‌ها یا QR) می‌رود، پس طولِ بخش‌ها ثابت نیست و صفرِ
 * چپ ندارند:
 *
 * | نام         | مثال            | بخش‌ها |
 * |-------------|-----------------|--------|
 * | کدِ کالا    | `14050608-10`   | تاریخ جلالیِ فشرده (۸ رقم)، شناسه‌ی کالا |
 * | بارکدِ دانه | `14050608-10-3` | کدِ کالا، شماره‌ی سریالِ دانه |
 *
 * چرا از سرور گرفته نمی‌شود: فرانت باید *قبل* از هر رفت‌وبرگشت بفهمد
 * کدِ اسکن‌شده کدِ کالاست یا کدِ یک دانه، تا فرمِ درست را باز کند.
 *
 * ⚠️ هر تغییری اینجا باید *همراهِ* تغییرِ `ProductCodeService` انجام
 * شود؛ واگرایی یعنی بارکدِ چاپ‌شده دیگر با آنچه سرور می‌شناسد یکی نیست.
 */

const SEPARATOR = "-";

/** `تاریخ-شناسه` یا `تاریخ-شناسه-سریال`؛ شناسه و سریال حداکثر ۱۰ رقم (`int`). */
const CODE_PATTERN = /^\d{8}(?:-\d{1,10}){1,2}$/;
/** خط‌تیره‌هایی که صفحه‌کلید یا اسکنر به‌جای `-` می‌فرستد (en/em dash، minus، کشیده). */
const DASH_VARIANTS = /[‐-―−﹘﹣－ـ]/g;
const WHITESPACE = /\s+/g;

/**
 * هر چیزی که اسکنر یا صفحه‌کلید تولید می‌کند → رقمِ لاتین، `-` واقعی،
 * بدونِ فاصله. اسکنرِ صفحه‌کلیدی با چیدمانِ فارسی رقم‌ها را فارسی
 * می‌فرستد؛ اینجا یکی می‌شوند تا تفسیر به چیدمانِ صفحه‌کلید وابسته نباشد.
 */
function cleanBarcode(code) {
  return normalizePersianDigits(String(code ?? ""))
    .replace(DASH_VARIANTS, SEPARATOR)
    .replace(WHITESPACE, "");
}

/**
 * تفسیرِ ورودیِ اسکن — قرینه‌ی `Parse`.
 *
 * دو بخش یعنی کدِ کالا، سه بخش یعنی بارکدِ یک دانه، هر چیز دیگری
 * `UNKNOWN`. شکلِ خروجی همان `BarcodeReference` سرور است تا نتیجه‌ی این
 * تابع و پاسخِ `ScanBarcode` در UI یک‌جور مصرف شوند. `normalizedPayload`
 * همان چیزی است که سرور با `BarcodePayload` مقایسه می‌کند.
 */
export function parseBarcode(scannedInput) {
  const cleaned = cleanBarcode(scannedInput);

  if (!CODE_PATTERN.test(cleaned)) {
    return {
      kind: BarcodeReferenceKindEnum.UNKNOWN,
      normalizedPayload: cleaned,
      productId: null,
      serialNumber: null,
    };
  }

  const [date, productId, serialNumber] = cleaned
    .split(SEPARATOR)
    .map((segment, index) => (index === 0 ? segment : Number(segment)));
  const isUnit = serialNumber !== undefined;

  return {
    kind: isUnit ? BarcodeReferenceKindEnum.UNIT : BarcodeReferenceKindEnum.PRODUCT,
    // صفرِ چپِ تایپ‌شده (`010`) حذف می‌شود، مثلِ سرور.
    normalizedPayload: [date, productId, ...(isUnit ? [serialNumber] : [])].join(SEPARATOR),
    productId,
    serialNumber: isUnit ? serialNumber : null,
  };
}

/**
 * بخش‌های کد جدا از هم: `["14050608", "10", "3"]`.
 *
 * برای جایی است که کد باید در چند سطر شکسته شود چون در یک سطر جا
 * نمی‌شود (برچسبِ باریکِ رول حرارتی). شکستن از روی همین مرزهای معنادار
 * انجام می‌شود نه از روی عرضِ ظرف، وگرنه رقم‌ها وسطِ یک بخش می‌شکنند و
 * کسی که برچسب را با چشم می‌خواند نمی‌فهمد کجای کد است.
 *
 * ورودیِ ناشناخته یک تکه برمی‌گردد: نمایشِ خامِ چیزی که در دست است از
 * نمایشِ هیچ بهتر است.
 */
export function barcodeSegments(code) {
  const { kind, normalizedPayload } = parseBarcode(code);
  if (kind === BarcodeReferenceKindEnum.UNKNOWN) return [String(code ?? "")];

  return normalizedPayload.split(SEPARATOR);
}

/**
 * کدِ کالا از روی بارکدِ یک دانه.
 *
 * `ProductUnitDto` سرور `productCode` ندارد؛ ولی کدِ کالا *داخلِ* بارکدِ
 * دانه است (دو بخشِ اول). پس به‌جای یک درخواستِ اضافه برای هر ردیف، از
 * خودِ بارکد بیرون کشیده می‌شود.
 */
export function productCodeOf(unitBarcode) {
  const segments = barcodeSegments(unitBarcode);
  if (segments.length !== 3) return "";

  return segments.slice(0, 2).join(SEPARATOR);
}
