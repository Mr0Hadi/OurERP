/**
 * جست‌وجو و آدرس‌یابیِ معکوس با Nominatim (OpenStreetMap) — بدونِ هیچ وابستگی به UI.
 *
 * هر دو تابع `signal` می‌گیرند تا درخواستِ قبلی با درخواستِ تازه لغو شود و پاسخِ
 * دیرآمده روی انتخابِ جدید ننشیند.
 */

const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";

const POSTAL_CODE_REGEX = /^[\d۰-۹]{4,10}(-[\d۰-۹]{3,6})?$/;
const ADMIN_PREFIX_REGEX = /^(شهرستان|بخش مرکزی|شهر|بخش|دهستان|روستای|استان)\s+/;
const CENTRAL_DISTRICT_REGEX = /^بخش مرکزی/;
const COUNTY_REGEX = /^شهرستان\s+/;

// حذف پیشوندهای رایج اداری برای مقایسه‌ی نام‌ها (مثلاً «شهر تهران» → «تهران»)
function extractCoreName(part) {
  return part.replace(ADMIN_PREFIX_REGEX, "").trim();
}

/**
 * سرویس Nominatim آدرس کامل را به‌صورت رشته‌ای «از جزئی به کلی» و جدا‌شده با کاما
 * برمی‌گرداند؛ این رشته معمولاً شامل سطوح اداریِ تکراری هم هست، مثلاً:
 *
 *   «..., شهر سیرجان, بخش مرکزی شهرستان سیرجان, شهرستان سیرجان, استان کرمان, ...»
 *
 * که در آن «شهرستان سیرجان» و «بخش مرکزی شهرستان سیرجان» چیزی به «شهر سیرجان»
 * اضافه نمی‌کنند. این تابع:
 *   ۱. کد پستی و نام کشور را از متن آدرس جدا و حذف می‌کند (کد پستی در متن آدرس
 *      نمایش داده نمی‌شود و در فیلد جداگانه‌ای هم ست نمی‌شود).
 *   ۲. سطح «بخش مرکزی ...» را همیشه حذف می‌کند (تقریباً هیچ‌وقت اطلاعات مفیدی
 *      نسبت به نام شهر اضافه نمی‌کند).
 *   ۳. سطح «شهرستان X» را فقط وقتی حذف می‌کند که نام X با یکی دیگر از اجزای آدرس
 *      (مثلاً «شهر X») یکی باشد؛ یعنی واقعاً تکراری باشد.
 *   ۴. ترتیب را از «جزئی به کلی» به «کلی به جزئی» (متداول در آدرس‌نویسی فارسی)
 *      برمی‌گرداند.
 */
export function formatAddressFromNominatim(displayName) {
  if (!displayName) return "";

  const parts = displayName
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) return displayName;

  const remaining = [...parts];

  // آخرین توکن معمولاً نام کشور است
  const country = remaining.length > 0 ? remaining.pop() : "";

  // اگر آخرین توکن باقی‌مانده شبیه کدپستی بود، حذفش کن (کدپستی در آدرس نمایش داده نمی‌شود)
  if (remaining.length > 0 && POSTAL_CODE_REGEX.test(remaining[remaining.length - 1])) {
    remaining.pop();
  }

  const coreNames = remaining.map(extractCoreName);

  const filtered = remaining.filter((part, index) => {
    // «بخش مرکزی ...» همیشه حذف می‌شود
    if (CENTRAL_DISTRICT_REGEX.test(part)) return false;

    // «شهرستان X» فقط وقتی حذف می‌شود که در جای دیگری از آدرس همان X تکرار شده باشد
    if (COUNTY_REGEX.test(part)) {
      const core = coreNames[index];
      const isDuplicate = coreNames.some(
        (otherCore, otherIndex) => otherIndex !== index && otherCore === core,
      );
      if (isDuplicate) return false;
    }

    return true;
  });

  // ترتیب Nominatim از جزئی به کلی است؛ برای خوانایی فارسی برعکسش می‌کنیم (کلی به جزئی)
  const hierarchy = [...filtered].reverse();

  let text = hierarchy.join("، ");
  if (country) {
    text = text ? `${text}، ${country}` : country;
  }

  return text || displayName;
}

/** نتیجه‌های جست‌وجوی متنی (حداکثر ۵ مورد، به فارسی). */
export async function searchPlaces(query, { signal } = {}) {
  const url = `${NOMINATIM_SEARCH_URL}?format=json&addressdetails=0&limit=5&accept-language=fa&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("جستجو با خطا مواجه شد.");
  return res.json();
}

/** آدرسِ خوانای یک نقطه، یا رشته‌ی خالی اگر چیزی پیدا نشد. */
export async function reverseGeocode(lat, lng, { signal } = {}) {
  const url = `${NOMINATIM_REVERSE_URL}?format=json&lat=${lat}&lon=${lng}&accept-language=fa&zoom=18`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("خطا در دریافت آدرس");
  const data = await res.json();
  return formatAddressFromNominatim(data?.display_name);
}
