// src/shared/services/files/objectKey.js

/**
 * توابعِ خالصِ کارِ با «کلید در برابر آدرس».
 *
 * چرا جدا از `api-v1.js`: این‌ها هیچ ربطی به شبکه ندارند و مصرف‌کننده‌شان
 * کامپوننت‌های نمایشی‌اند (`SignedImage`). وقتی داخل فایلِ axios بودند،
 * هر کامپوننتی که فقط می‌خواست بداند «این رشته آدرس است یا کلید» کلِ
 * لایه‌ی انتقال را هم با خودش می‌کشید — و همان منطق در دو فایل تکرار
 * شده بود.
 */

/** آیا این رشته را می‌شود مستقیم در `<img src>` گذاشت؟ */
export function isDisplayableUrl(value) {
  return /^(https?:|blob:|data:)/i.test(value ?? "");
}

/**
 * قرینه‌ی سبکِ `LiaraObjectStorageService.NormalizeKey`.
 *
 * چرا لازم است: سند می‌گوید هنگام ویرایش باید `imageKey` برگردانده شود،
 * ولی اگر کدی اشتباهاً `imageUrl`ِ امضاشده را بفرستد سرور خودش آن را به
 * کلید تبدیل می‌کند. همین کار را این‌جا هم می‌کنیم تا کلیدِ داخلِ state
 * از همان اول تمیز باشد و مقایسه‌ی «عوض شده یا نه» درست کار کند.
 */
export function objectKeyOf(keyOrUrl) {
  const value = typeof keyOrUrl === "string" ? keyOrUrl.trim() : "";
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) return value.replace(/^\/+/, "") || null;

  try {
    const { pathname } = new URL(value);
    // مسیرِ بدون کوئری = کلید؛ کوئری همان امضای منقضی‌شده است.
    const path = decodeURIComponent(pathname).replace(/^\/+/, "");
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
  const displayable = isDisplayableUrl(imageUrl);
  return {
    key: imageKey ?? (displayable ? null : imageUrl || null),
    url: displayable ? imageUrl : null,
  };
}
