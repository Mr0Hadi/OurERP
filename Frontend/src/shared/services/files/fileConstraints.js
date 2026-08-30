// src/shared/services/files/fileConstraints.js

/**
 * آینه‌ی محدودیت‌های `UploadImageCommandHandler` در بکند (بخش ۱۷ سند).
 *
 * چرا سمت کلاینت هم چک می‌شود: سرور در صورت نقض، ۴۰۰ با پیام فارسی
 * می‌دهد و *هیچ چیزی آپلود نمی‌شود* — یعنی کاربر باید منتظرِ رفت‌وبرگشتِ
 * یک فایل ۲۰ مگابایتی بماند تا بفهمد فرمتش غلط بوده. این چک همان خطا را
 * قبل از خرج‌شدنِ پهنای باند می‌دهد.
 *
 * سرور همچنان مرجع است؛ این‌جا فقط یک فیلترِ زودهنگام است. اگر
 * `appsettings.json` عوض شد، این فایل هم باید به‌روز شود — پیام‌ها عمداً
 * هم‌متنِ پیام‌های سرورند تا کاربر دو بیان از یک خطا نبیند.
 */

export const MAX_IMAGE_SIZE_MB = 5;
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024;

export const ALLOWED_IMAGE_EXTENSIONS = Object.freeze([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
]);

export const ALLOWED_IMAGE_CONTENT_TYPES = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

/** مقدارِ `accept` برای `<input type="file">` — همان لیست بالا. */
export const IMAGE_ACCEPT = ALLOWED_IMAGE_EXTENSIONS.join(",");

function extensionOf(fileName = "") {
  const dot = fileName.lastIndexOf(".");
  return dot < 0 ? "" : fileName.slice(dot).toLowerCase();
}

/**
 * @returns پیامِ خطای فارسی، یا `null` اگر فایل قابل ارسال باشد.
 *
 * ترتیبِ چک‌ها عمداً همان ترتیبِ هندلرِ سرور است تا کاربر برای یک فایلِ
 * خراب، دو بار دو پیامِ متفاوت نگیرد.
 */
export function validateImageFile(file) {
  if (!file) return "فایلی انتخاب نشده است.";
  if (!file.size) return "فایل ارسال شده خالی است.";

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return `حجم تصویر نباید بیشتر از ${MAX_IMAGE_SIZE_MB} مگابایت باشد.`;
  }

  const extension = extensionOf(file.name);
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(extension)) {
    return `فرمت تصویر مجاز نیست. فرمت‌های مجاز: ${ALLOWED_IMAGE_EXTENSIONS.join("، ")}`;
  }

  // `type` می‌تواند خالی باشد (بعضی مرورگرها برای فایل‌های ناشناس چیزی
  // نمی‌دهند)؛ سرور هم در آن حالت فقط به پسوند اکتفا می‌کند.
  if (file.type && !ALLOWED_IMAGE_CONTENT_TYPES.includes(file.type.toLowerCase())) {
    return "نوع فایل ارسال شده تصویر معتبری نیست.";
  }

  return null;
}
