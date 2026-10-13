// wasmِ ZXing با `?url` داخلِ بیلد کپی و از همین دامنه سِرو می‌شود؛
// پیش‌فرضِ zxing-wasm آن را از jsDelivr می‌گیرد و انبارِ بدونِ اینترنتِ
// آزاد با آن پیش‌فرض اسکنر نخواهد داشت.
import zxingWasmUrl from "zxing-wasm/reader/zxing_reader.wasm?url";

/**
 * فرمت‌های هر حالتِ اسکن، به دو نام‌گذاری: Barcode Detection API (نیتیو)
 * و ZXing.
 */
export const SCAN_MODES = {
  barcode: { native: ["code_128"], zxing: ["Code128"] },
  qr: { native: ["qr_code"], zxing: ["QRCode"] },
};

let zxingPromise = null;

function loadZXing() {
  if (!zxingPromise) {
    zxingPromise = import("zxing-wasm/reader")
      .then(async (zxing) => {
        await zxing.prepareZXingModule({
          overrides: {
            locateFile: (path, prefix) =>
              path.endsWith(".wasm") ? zxingWasmUrl : `${prefix}${path}`,
          },
          fireImmediately: true,
        });
        return zxing;
      })
      .catch((error) => {
        // تلاشِ بعدی دوباره بکشد؛ یک خطای شبکه نباید اسکنر را بسوزاند.
        zxingPromise = null;
        throw error;
      });
  }
  return zxingPromise;
}

async function createNative(formats) {
  const Native = globalThis.BarcodeDetector;
  if (typeof Native === "undefined") return null;
  try {
    const supported = await Native.getSupportedFormats();
    if (!formats.every((f) => supported.includes(f))) return null;
    return new Native({ formats });
  } catch {
    return null;
  }
}

/**
 * یک خواننده‌ی فریم برای یک حالت می‌سازد: `read(video)` → متنِ کد یا null.
 *
 * هر فریم دو لایه دارد:
 *
 * ۱. `BarcodeDetector` نیتیو (کرومِ اندروید) روی کلِ فریم — سریع، و برای
 *    کدِ سالم معمولاً کافی.
 * ۲. اگر نیتیو چیزی نخواند (یا اصلاً نبود، یا ماژولِ Play Servicesش نصب
 *    نیست و همیشه آرایه‌ی خالی می‌دهد)، ZXing‑wasm روی همان مربعِ وسطِ
 *    فریم که کاربر می‌بیند، با تنظیماتِ سخت‌گیرانه: `tryDenoise` برای QRِ
 *    تاخورده/خط‌خورده و دو binarizerِ متناوب برای نورِ ناهمگون.
 *    BarcodeDetector این تنظیمات را در اختیار نمی‌گذارد؛ برای همین
 *    مستقیماً ZXing صدا زده می‌شود.
 *
 * چون لایه‌ی دوم همیشه هست، دیگر لازم نیست سلامتِ نیتیو را از قبل با کدِ
 * مرجع بسنجیم.
 */
export async function createFrameReader(mode) {
  const { native: nativeFormats, zxing: zxingFormats } = SCAN_MODES[mode];
  const [native, zxing] = await Promise.all([
    createNative(nativeFormats),
    loadZXing(),
  ]);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  let frame = 0;

  return async function read(video) {
    if (native) {
      const [hit] = await native.detect(video).catch(() => []);
      if (hit?.rawValue) return hit.rawValue;
    }

    const { videoWidth: w, videoHeight: h } = video;
    if (!w || !h) return null;
    // همان مربعی که پیش‌نمایش (object-cover) نشان می‌دهد.
    const side = Math.min(w, h);
    canvas.width = side;
    canvas.height = side;
    ctx.drawImage(video, (w - side) / 2, (h - side) / 2, side, side, 0, 0, side, side);

    frame += 1;
    const [result] = await zxing.readBarcodes(ctx.getImageData(0, 0, side, side), {
      formats: zxingFormats,
      tryHarder: true,
      tryRotate: true,
      tryInvert: true,
      tryDenoise: mode === "qr",
      binarizer: frame % 2 ? "LocalAverage" : "GlobalHistogram",
      maxNumberOfSymbols: 1,
    });
    return result?.isValid ? result.text : null;
  };
}
