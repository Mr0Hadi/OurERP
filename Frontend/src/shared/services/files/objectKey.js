/**
 * توابعِ خالصِ «کلید در برابر آدرس».
 *
 * جدا از `api-v1.js` چون هیچ ربطی به شبکه ندارند و مصرف‌کننده‌شان
 * کامپوننتِ نمایشی است (`RemoteImage`)؛ وگرنه هر کامپوننتی که فقط
 * می‌خواهد بداند «این رشته آدرس است یا کلید» کلِ لایه‌ی انتقال را هم با
 * خودش می‌کشد.
 *
 * قراردادِ آدرس: بایت‌ها را خودِ API سرو می‌کند و آدرسش ثابت است و
 * منقضی نمی‌شود (آدرسِ مستقیمِ باکت کار نمی‌کند — باکتِ Liara به
 * User-Agentِ مرورگر `404 page not found` می‌دهد):
 *
 *   {PublicBaseUrl}/api/File/GetImage?objectKey={key}
 *
 * دو دامِ همین شکل:
 *  ۱. کلید در *کوئری‌استرینگ* است نه در مسیر؛ خواندنِ `pathname`
 *     `api/File/GetImage` را به‌عنوان کلید برمی‌گرداند.
 *  ۲. اگر `PublicBaseUrl` در سرور خالی باشد آدرس *نسبی* می‌آید، که
 *     برای فرانتِ روی دامنه‌ی دیگر بی‌معنی است؛ پس نسبت به هاستِ API
 *     حل می‌شود.
 */

/**
 * قرینه‌ی `LiaraObjectStorageService.ImageRoute` و
 * `ObjectKeyQueryParameter`. اگر آن‌جا عوض شد، این‌جا هم باید عوض شود.
 */
const IMAGE_ROUTE = "/api/file/getimage";
const OBJECT_KEY_PARAM = "objectkey";

/**
 * هاستِ API — برای حل‌کردنِ آدرس‌های نسبی. `VITE_API_BASE_URL` خودش
 * `/api` را دارد، پس فقط origin آن برداشته می‌شود.
 */
function apiOrigin() {
  const base = import.meta.env?.VITE_API_BASE_URL || "";
  try {
    return new URL(base, window.location.origin).origin;
  } catch {
    return window.location.origin;
  }
}

/** آیا این رشته را می‌شود مستقیم در `<img src>` گذاشت؟ */
function isDisplayableUrl(value) {
  return /^(https?:|blob:|data:)/i.test(value ?? "");
}

/**
 * آدرسی که واقعاً می‌شود در `<img src>` گذاشت.
 *
 * مطلق‌ها دست‌نخورده رد می‌شوند؛ آدرسِ نسبیِ خودِ API (حالتی که
 * `PublicBaseUrl` ست نشده) به هاستِ API چسبانده می‌شود — نه به origin
 * فرانت، که در deployِ جدا اشتباه است.
 */
export function toDisplayableUrl(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  if (isDisplayableUrl(raw)) return raw;
  if (raw.startsWith("/")) return apiOrigin() + raw;
  return null;
}

/** خواندنِ `objectKey` از کوئری‌استرینگِ آدرسِ تصویرِ خودمان. */
function objectKeyFromQuery(url) {
  if (!url.pathname.toLowerCase().endsWith(IMAGE_ROUTE)) return null;
  for (const [name, value] of url.searchParams.entries()) {
    if (name.toLowerCase() === OBJECT_KEY_PARAM) return value.trim() || null;
  }
  return null;
}

/**
 * قرینه‌ی سبکِ `LiaraObjectStorageService.NormalizeKey`.
 *
 * چرا لازم است: سرور هنگام ویرایش `imageKey` می‌خواهد، ولی اگر کدی
 * اشتباهاً `imageUrl` را بفرستد سرور خودش آن را به کلید تبدیل می‌کند.
 * همین کار را این‌جا هم می‌کنیم تا کلیدِ داخلِ state از همان اول تمیز
 * باشد و مقایسه‌ی «عوض شده یا نه» درست کار کند.
 */
export function objectKeyOf(keyOrUrl) {
  const value = typeof keyOrUrl === "string" ? keyOrUrl.trim() : "";
  if (!value) return null;

  // نه آدرسِ مطلق است نه نسبی — پس از قبل خودِ کلید است.
  if (!/^https?:\/\//i.test(value) && !value.startsWith("/")) {
    return value || null;
  }

  try {
    const url = new URL(value, apiOrigin());

    // آدرسِ تصویرِ خودمان کلید را در کوئری دارد، نه در مسیر.
    const fromQuery = objectKeyFromQuery(url);
    if (fromQuery) return fromQuery;

    // آدرسِ مستقیمِ باکت: کوئری همان امضای منقضی‌شده است و کنار می‌رود.
    const path = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    return path || null;
  } catch {
    return value;
  }
}

/**
 * جداکردنِ «کلیدِ پایدار» از «آدرسِ قابل نمایش» در ورودیِ نادقیق.
 *
 * هرچیزی که آدرس نباشد، *کلید* است — چون در mock و در کدِ قدیمی گاهی
 * ObjectKey خام در `imageUrl` نشسته. سرور هم دقیقاً همین سخت‌نگرفتن را
 * دارد (`NormalizeKey`)، پس این هم‌خوان با قرارداد است نه یک وصله.
 */
export function splitImageSource(imageKey, imageUrl) {
  const url = toDisplayableUrl(imageUrl);
  return {
    // آدرس هم کلید را در خودش دارد، پس اگر `imageKey` نیامده باشد از
    // خودِ آدرس بیرون کشیده می‌شود — همان چیزی که برای درخواستِ بعدی
    // لازم است.
    key: objectKeyOf(imageKey) ?? objectKeyOf(imageUrl),
    url,
  };
}
