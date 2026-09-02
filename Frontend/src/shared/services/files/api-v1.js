// src/shared/services/files/api-v1.js

import axiosInstance from "@/shared/services/api/axios";
import { validateDocumentFile } from "./fileConstraints";
import { objectKeyOf } from "./objectKey";

/**
 * لایه‌ی تماسِ خام با `api/File` (بخش ۱۷ سند api-guide.fa.md).
 *
 * سه نکته‌ی قرارداد که هرچه بالاتر است بر پایه‌ی آن‌ها ساخته شده:
 *
 * ۱. آپلود *جدا* از ثبت موجودیت است. این‌جا فقط `objectKey` گرفته می‌شود؛
 *    همان کلید بعداً در فیلد `imageUrl` دستور `CreateX`/`UpdateX` می‌رود.
 * ۲. باکت خصوصی است؛ `url` یک امضای موقتی (پیش‌فرض ۶۰ دقیقه) است و
 *    **هرگز نباید ذخیره شود** — نه در فرم، نه در payload، نه در کش دائمی.
 * ۳. سرور هنگام تعویض تصویر، فایل قبلی را پاک نمی‌کند. پاک‌سازیِ یتیم‌ها
 *    کارِ فرانت است (`useImageUpload` این را مدیریت می‌کند).
 */

/**
 * سرور `Data` را camelCase می‌فرستد، ولی شیء ناشناسِ `GetImageUrl` در
 * بکند با نامِ PascalCase تعریف شده. برای اینکه یک تغییرِ سریالایزر
 * صفحه را سفید نکند، هر دو شکل خوانده می‌شود — همان محافظه‌کاریِ
 * `isEnvelope` در axios.js.
 */
function pick(source, name) {
  if (!source) return undefined;
  const pascal = name.charAt(0).toUpperCase() + name.slice(1);
  return source[name] ?? source[pascal];
}

/** شکلِ یکسانِ نتیجه‌ی آپلود در کل فرانت. */
function normalizeUploadedFile(data) {
  return {
    objectKey: pick(data, "objectKey") ?? null,
    url: pick(data, "url") ?? null,
    fileName: pick(data, "fileName") ?? "",
    contentType: pick(data, "contentType") ?? null,
    size: pick(data, "size") ?? 0,
  };
}

/**
 * `POST api/File/UploadImage` — `multipart/form-data`.
 *
 * @param file      شیء `File` از input
 * @param folder    `ImageFolderEnum`
 * @param onProgress (percent:number) => void — برای نوارِ پیشرفت
 * @param signal    `AbortSignal` تا انتخابِ فایلِ بعدی آپلودِ قبلی را لغو کند
 * @returns { objectKey, url, fileName, contentType, size }
 */
export async function uploadImage({ file, folder, onProgress, signal } = {}) {
  // چکِ محلی قبل از شبکه؛ پیام‌ها هم‌متنِ سرورند. فهرستِ مجاز همان
  // فهرستِ سرور است (تصویر + PDF)؛ باریک‌ترکردنش برای یک فیلدِ خاص کارِ
  // `useFileUploadList` است، نه این لایه.
  const validationError = validateDocumentFile(file);
  if (validationError) throw new Error(validationError);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", String(folder));

  // Content-Type عمداً ست نمی‌شود: axios برای FormData هدرِ پیش‌فرضِ
  // instance را کنار می‌گذارد تا مرورگر خودش boundary را بسازد.
  const { data } = await axiosInstance.post("/File/UploadImage", formData, {
    signal,
    // آپلود می‌تواند تا ۵ مگابایت باشد؛ تایم‌اوتِ ۱۵ ثانیه‌ایِ پیش‌فرض
    // روی اینترنتِ ضعیف کوتاه است.
    timeout: 120000,
    onUploadProgress: onProgress
      ? (event) => {
          if (!event.total) return;
          onProgress(Math.round((event.loaded * 100) / event.total));
        }
      : undefined,
  });

  return normalizeUploadedFile(data);
}

/**
 * `GET api/File/GetImageUrl` — امضای تازه برای یک کلیدِ ذخیره‌شده.
 *
 * برای صفحه‌ای که مدت زیادی باز می‌ماند یا پاسخِ لیستی که کش شده، به‌جای
 * گرفتنِ دوباره‌ی کلِ موجودیت.
 */
export async function getImageUrl(objectKey, { signal } = {}) {
  const key = objectKeyOf(objectKey);
  if (!key) return null;

  const { data } = await axiosInstance.get("/File/GetImageUrl", {
    params: { objectKey: key },
    signal,
  });

  return pick(data, "url") ?? null;
}

/**
 * `DELETE api/File/DeleteImage`.
 *
 * خطا عمداً بلعیده می‌شود: این تماس همیشه یک *پاک‌سازیِ جانبی* است (فایلِ
 * یتیمِ بعد از تعویض تصویر یا انصراف از فرم). اگر شکست بخورد، نتیجه‌اش
 * یک فایلِ بی‌استفاده در باکت است — نه چیزی که ارزش داشته باشد جلوی
 * ذخیره‌ی موفقِ کاربر toastِ قرمز بگذارد.
 */
export async function deleteImage(objectKey) {
  const key = objectKeyOf(objectKey);
  if (!key) return false;

  try {
    await axiosInstance.delete("/File/DeleteImage", { params: { objectKey: key } });
    return true;
  } catch {
    return false;
  }
}

/** پاک‌سازیِ چند کلید با هم — بعد از ذخیره‌ی یک فرمِ چندتصویره. */
export async function deleteImages(objectKeys = []) {
  const keys = objectKeys.map(objectKeyOf).filter(Boolean);
  if (!keys.length) return;
  await Promise.allSettled(keys.map((key) => deleteImage(key)));
}
