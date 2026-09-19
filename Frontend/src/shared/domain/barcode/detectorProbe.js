/**
 * الگوهای مرجع برای سنجشِ سلامتِ `BarcodeDetector` نیتیو.
 *
 * چرا اصلاً لازم است: روی اندروید، دیکدرِ نیتیوِ کروم پشتِ ماژولِ بارکدِ
 * Google Play Services است و آن ماژول *درخواستی* دانلود می‌شود. اگر
 * دانلود نشده باشد — دستگاهِ بدونِ Play Services، رامِ سفارشی، یا
 * دسترسیِ مسدود — رفتارِ مستندشده این است که `detect()` خطا نمی‌دهد و
 * بی‌سروصدا **همیشه آرایه‌ی خالی** برمی‌گرداند. یعنی اسکنر تا ابد
 * می‌چرخد بدون اینکه چیزی بخواند و بدون یک خطا در کنسول.
 *
 * `getSupportedFormats()` این حالت را نمی‌گیرد: فهرستِ فرمت‌ها را
 * برمی‌گرداند حتی وقتی دیکدر عملاً no-op است. تنها سنجشِ مطمئن این است
 * که یک کدِ **معلوم** به او بدهیم و ببینیم همان را پس می‌دهد یا نه.
 *
 * هر دو الگو payloadِ `"1"` را حمل می‌کنند و با همان کتابخانه‌هایی ساخته
 * شده‌اند که خودِ برچسب‌ها را می‌سازند (`@zxing/library` و JsBarcode)،
 * بعد به شکلِ متنِ خوانا اینجا ثابت شده‌اند تا نه وابستگیِ زمانِ اجرا
 * لازم باشد نه بلابِ باینریِ مرورشدنی‌نشده.
 */
export const PROBE_PAYLOAD = "1";

/** QR نسخه‌ی ۱ به‌همراه quiet zoneِ ۴ ماژولی — ۲۹×۲۹ ماژول. */
const PROBE_QR = [
  ".............................",
  ".............................",
  ".............................",
  ".............................",
  "....#######..#.##.#######....",
  "....#.....#..###..#.....#....",
  "....#.###.#.##.##.#.###.#....",
  "....#.###.#..#.#..#.###.#....",
  "....#.###.#...#.#.#.###.#....",
  "....#.....#.....#.#.....#....",
  "....#######.#.#.#.#######....",
  "............##.##............",
  "....###.########.##...#......",
  ".......#.#..#.#...#...##.....",
  "....##.#..####..#...#...#....",
  "......##.#.#.#....#...##.....",
  "......#.####....#.#.#.###....",
  "............#.##.#.#.#.#.....",
  "....#######.#..#.###.####....",
  "....#.....#.#..###.###.#.....",
  "....#.###.#.#..#.###.##.#....",
  "....#.###.#..#....#...##.....",
  "....#.###.#.#...#...#...#....",
  "....#.....#.##....#...#......",
  "....#######.#.#.#.#.#.#.#....",
  ".............................",
  ".............................",
  ".............................",
  ".............................",
];

/** میله‌های CODE128 بدونِ quiet zone؛ هنگام رسم ۱۰ ماژول دو طرف اضافه می‌شود. */
const PROBE_CODE128 = "##.#..#....#..###..##.##..###..#.##...###.#.##";
const CODE128_QUIET_MODULES = 10;

/** هر ماژول چند پیکسل رسم شود. دست‌ودل‌باز باشید: تصویرِ خیلی کوچک
 *  می‌تواند دیکدرِ سالم را هم رد کند و آن‌وقت probe خودش خطا می‌شود. */
const MODULE_PX = 8;

function drawMatrix(rows) {
  const size = rows.length;
  const canvas = document.createElement("canvas");
  canvas.width = size * MODULE_PX;
  canvas.height = size * MODULE_PX;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      if (rows[y][x] === "#") {
        ctx.fillRect(x * MODULE_PX, y * MODULE_PX, MODULE_PX, MODULE_PX);
      }
    }
  }
  return canvas;
}

function drawBars(bars) {
  const width = bars.length + CODE128_QUIET_MODULES * 2;
  const canvas = document.createElement("canvas");
  canvas.width = width * MODULE_PX;
  canvas.height = 100;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000";
  for (let x = 0; x < bars.length; x++) {
    if (bars[x] === "#") {
      ctx.fillRect(
        (x + CODE128_QUIET_MODULES) * MODULE_PX,
        0,
        MODULE_PX,
        canvas.height,
      );
    }
  }
  return canvas;
}

/**
 * هر دو نمادِ مرجع را به detector می‌دهد و می‌گوید آیا واقعاً کار می‌کند.
 *
 * هر دو باید بخوانند، نه یکی: حالتِ «QR می‌خواند ولی CODE128 نه» روی
 * بیلدهای ناقصِ نیتیو دیده می‌شود و برچسب‌های خطیِ ما را از کار
 * می‌اندازد.
 */
export async function isDetectorWorking(detector) {
  try {
    const [qr, code128] = await Promise.all([
      detector.detect(drawMatrix(PROBE_QR)),
      detector.detect(drawBars(PROBE_CODE128)),
    ]);
    return (
      qr[0]?.rawValue === PROBE_PAYLOAD && code128[0]?.rawValue === PROBE_PAYLOAD
    );
  } catch {
    return false;
  }
}
