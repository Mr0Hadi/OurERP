// وقتی مرورگر `BarcodeDetector` نیتیو ندارد، wasmِ ZXing لازم می‌شود. با
// `?url` خودِ فایل در بیلد کپی و از همین دامنه سِرو می‌شود؛ پیش‌فرضِ
// zxing-wasm آن را از jsDelivr می‌گیرد و انبارِ بدونِ اینترنتِ آزاد با آن
// پیش‌فرض اصلاً اسکنر نخواهد داشت.
import zxingWasmUrl from "zxing-wasm/reader/zxing_reader.wasm?url";
import { isDetectorWorking } from "./detectorProbe";

/**
 * تنها دو نمادی که برچسب‌های خودمان دارند — `barcodeConfig` هم همین دو را
 * چاپ می‌کند (CODE128 و QR).
 *
 * فهرست را بی‌دلیل بلندتر نکنید: هر فرمتِ اضافه یک عبورِ دیگر روی هر فریم
 * است و اسکن را کند می‌کند. نام‌ها قراردادِ Barcode Detection API هستند
 * (snake_case)، نه enumِ `@zxing/library`.
 */
export const SCAN_FORMATS = ["qr_code", "code_128"];

/**
 * یک `BarcodeDetector` می‌سازد و تا آخرِ عمرِ صفحه همان را برمی‌گرداند.
 *
 * دو لایه دارد و ترتیبشان عمدی است:
 *
 * ۱. نیتیوِ مرورگر — روی کرومِ اندروید (یعنی عملاً همه‌ی گوشی‌های انبار)
 *    موجود است و پشتش دیکدرِ نیتیوِ خودِ سیستم است: خارج از ریسه‌ی UI و
 *    با شتاب‌دهی. از هر چیزی که در جاوااسکریپت بنویسیم سریع‌تر است.
 * ۲. ponyfill روی ZXing‑C++ که به WebAssembly کامپایل شده — برای iOS و
 *    فایرفاکس که نیتیو ندارند. هنوز چند برابرِ `@zxing/browser`ِ قبلی
 *    (جاوااسکریپتِ خالص) سریع است.
 *
 * چون API هر دو یکی است، `CameraScanner` فقط یک مسیرِ کد دارد.
 *
 * نکته‌ی لایه‌ی اول: صرفِ وجودِ `window.BarcodeDetector` هیچ تضمینی
 * نیست و دو تله دارد که هر دو اینجا چک می‌شوند:
 *
 * الف) بعضی بیلدها فقط QR را پشتیبانی می‌کنند. اگر CODE128 در فهرستِ
 *      `getSupportedFormats()` نبود بارکدِ خطیِ برچسب‌ها بی‌صدا از کار
 *      می‌افتاد.
 * ب)  روی اندروید دیکدرِ نیتیو پشتِ ماژولِ درخواستیِ Play Services است؛
 *      اگر آن ماژول نباشد `detect()` خطا نمی‌دهد و فقط همیشه آرایه‌ی
 *      خالی برمی‌گرداند — اسکنری که تا ابد می‌چرخد و هیچ نمی‌خواند.
 *      `getSupportedFormats()` این را نمی‌گیرد، پس با یک کدِ معلوم
 *      محک می‌زنیم (`detectorProbe`).
 *
 * در هر دو حالت می‌افتیم روی wasm. wasm داخلِ بیلدِ خودمان است و هیچ
 * درخواستِ شبکه‌ای به بیرون نمی‌زند، پس نبودنِ Play Services یا
 * دسترسی‌نداشتن به سرویس‌های گوگل اسکنر را از کار نمی‌اندازد.
 */
let detectorPromise = null;

async function createWasmDetector() {
  const { BarcodeDetector, prepareZXingModule } = await import(
    "barcode-detector/ponyfill"
  );

  await prepareZXingModule({
    overrides: {
      locateFile: (path, prefix) =>
        path.endsWith(".wasm") ? zxingWasmUrl : `${prefix}${path}`,
    },
    // همین‌جا wasm را بالا بیاور، نه در اولین فریم: وگرنه اولین detect
    // چند صد میلی‌ثانیه معطلِ کامپایلِ ماژول می‌ماند.
    fireImmediately: true,
  });

  return new BarcodeDetector({ formats: SCAN_FORMATS });
}

async function createDetector() {
  const Native = globalThis.BarcodeDetector;

  if (typeof Native !== "undefined") {
    try {
      const supported = await Native.getSupportedFormats();
      if (SCAN_FORMATS.every((format) => supported.includes(format))) {
        const native = new Native({ formats: SCAN_FORMATS });
        if (await isDetectorWorking(native)) return native;
        console.warn(
          "[barcode] BarcodeDetector نیتیو کدِ مرجع را نخواند؛ برگشت به ZXing wasm.",
        );
      }
    } catch {
      // پیاده‌سازیِ نیتیوِ خراب — بی‌سروصدا برو سراغ wasm.
    }
  }

  return createWasmDetector();
}

export function getBarcodeDetector() {
  if (!detectorPromise) {
    detectorPromise = createDetector().catch((error) => {
      // تا دفعه‌ی بعد دوباره تلاش شود؛ کششِ ناموفقِ wasm نباید اسکنر را
      // برای همیشه بسوزاند.
      detectorPromise = null;
      throw error;
    });
  }
  return detectorPromise;
}
