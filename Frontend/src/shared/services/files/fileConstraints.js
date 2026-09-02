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
 *
 * **PDF:** بکند (۲۰۲۶-۰۹-۰۱، گزینه‌ی ۱ سندِ
 * `invoice-attachment-requirements.fa.md` بند ۲.۴) `.pdf` و
 * `application/pdf` را به همان `AllowedImageExtensions`/
 * `AllowedImageContentTypes` اضافه کرد — یعنی یک اندپوینتِ آپلود، با
 * فهرستِ مجازِ گسترده‌تر. سمت ما اما دو فهرست جدا نگه داشته می‌شود:
 * جایی که واقعاً «تصویر» می‌خواهیم (عکسِ محصول، عکسِ نوبتِ دریافت) نباید
 * PDF بپذیرد، چون آن‌جا پیش‌نمایشِ تصویری معنا دارد. «سند» (ضمیمه‌ی
 * فاکتور/پیش‌فاکتور) هر دو را می‌پذیرد.
 */

export const MAX_UPLOAD_SIZE_MB = 5;
export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

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

/** همان فهرست + PDF — سقفِ حجم یکی است (سرور هم یک `MaxImageSizeBytes` دارد). */
export const ALLOWED_DOCUMENT_EXTENSIONS = Object.freeze([
  ...ALLOWED_IMAGE_EXTENSIONS,
  ".pdf",
]);

export const ALLOWED_DOCUMENT_CONTENT_TYPES = Object.freeze([
  ...ALLOWED_IMAGE_CONTENT_TYPES,
  "application/pdf",
]);

/** مقدارِ `accept` برای `<input type="file">` — همان لیست بالا. */
export const IMAGE_ACCEPT = ALLOWED_IMAGE_EXTENSIONS.join(",");
export const DOCUMENT_ACCEPT = ALLOWED_DOCUMENT_EXTENSIONS.join(",");

export function extensionOf(fileName = "") {
  const dot = fileName.lastIndexOf(".");
  return dot < 0 ? "" : fileName.slice(dot).toLowerCase();
}

/**
 * آیا این فایل/کلید PDF است — برای جاهایی که `<img>` جواب نمی‌دهد و
 * باید آیکن و «بازکردن در تب جدید» نشان داده شود.
 *
 * روی `objectKey` هم کار می‌کند (کلید پسوند را نگه می‌دارد) و روی URLِ
 * امضاشده هم، به شرطِ کنارگذاشتنِ query — امضای S3 بعد از `?` می‌آید.
 */
export function isPdfName(nameOrUrl = "") {
  const withoutQuery = String(nameOrUrl).split("?")[0];
  return extensionOf(withoutQuery) === ".pdf";
}

function validate(file, { extensions, contentTypes, typeMessage }) {
  if (!file) return "فایلی انتخاب نشده است.";
  if (!file.size) return "فایل ارسال شده خالی است.";

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return `حجم فایل نباید بیشتر از ${MAX_UPLOAD_SIZE_MB} مگابایت باشد.`;
  }

  const extension = extensionOf(file.name);
  if (!extensions.includes(extension)) {
    return `فرمت فایل مجاز نیست. فرمت‌های مجاز: ${extensions.join("، ")}`;
  }

  // `type` می‌تواند خالی باشد (بعضی مرورگرها برای فایل‌های ناشناس چیزی
  // نمی‌دهند)؛ سرور هم در آن حالت فقط به پسوند اکتفا می‌کند.
  if (file.type && !contentTypes.includes(file.type.toLowerCase())) {
    return typeMessage;
  }

  return null;
}

/**
 * @returns پیامِ خطای فارسی، یا `null` اگر فایل قابل ارسال باشد.
 *
 * ترتیبِ چک‌ها عمداً همان ترتیبِ هندلرِ سرور است تا کاربر برای یک فایلِ
 * خراب، دو بار دو پیامِ متفاوت نگیرد.
 */
export function validateImageFile(file) {
  return validate(file, {
    extensions: ALLOWED_IMAGE_EXTENSIONS,
    contentTypes: ALLOWED_IMAGE_CONTENT_TYPES,
    typeMessage: "نوع فایل ارسال شده تصویر معتبری نیست.",
  });
}

/** همان چک، ولی PDF هم مجاز است — ضمیمه‌ی فاکتور/پیش‌فاکتور. */
export function validateDocumentFile(file) {
  return validate(file, {
    extensions: ALLOWED_DOCUMENT_EXTENSIONS,
    contentTypes: ALLOWED_DOCUMENT_CONTENT_TYPES,
    typeMessage: "نوع فایل ارسال شده مجاز نیست؛ فقط تصویر یا PDF.",
  });
}
