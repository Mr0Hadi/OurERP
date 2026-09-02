// src/shared/services/files/api-mock.js

import { ImageFolderEnum } from "@/shared/domain/enums/imageFolder";
import { validateDocumentFile } from "./fileConstraints";

/**
 * قرینه‌ی mockِ `api/File` — دقیقاً همان امضاها و همان شکلِ خروجیِ
 * `api-v1.js`، بدون شبکه.
 *
 * چرا لازم است: بقیه‌ی فرانت هنوز روی `api-mockData` کار می‌کند. اگر فرمِ
 * مشتری برای تصویر به سرور واقعی وصل باشد ولی برای خودِ مشتری نه، توسعه
 * روی لپ‌تاپِ بدونِ بک‌اند می‌ایستد.
 *
 * دو محدودیتِ عمدی که باید بدانید:
 *
 * - آدرس‌ها `blob:` هستند و با رفرشِ صفحه می‌میرند. یعنی تصویری که در
 *   mock ذخیره کرده‌اید بعد از reload دیده نمی‌شود. درست‌کردنش (base64 در
 *   localStorage) یعنی شبیه‌سازیِ یک باکت، که ارزشش را ندارد.
 * - انقضای امضا شبیه‌سازی نمی‌شود؛ مسیرِ «امضا منقضی شد» فقط با سرور
 *   واقعی آزمایش می‌شود.
 */

const FOLDER_PREFIXES = {
  [ImageFolderEnum.PRODUCTS]: "products",
  [ImageFolderEnum.CUSTOMERS]: "customers",
  [ImageFolderEnum.SUPPLIERS]: "suppliers",
  [ImageFolderEnum.RECEIVING]: "receiving",
};

/** objectKey → blob URL. همان نقشی که باکت در نسخه‌ی واقعی دارد. */
const bucket = new Map();

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function buildObjectKey(fileName, folder) {
  const dot = fileName.lastIndexOf(".");
  const extension = dot < 0 ? "" : fileName.slice(dot).toLowerCase();
  const prefix = FOLDER_PREFIXES[folder] ?? "misc";
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(36).slice(2);

  return `${prefix}/${now.getFullYear()}/${month}/${id}${extension}`;
}

export { objectKeyOf } from "./objectKey";

export async function uploadImage({ file, folder, onProgress, signal } = {}) {
  // همان اعتبارسنجیِ سرور و همان پیام‌ها، تا رفتارِ mock و سرور یکی باشد
  // — یعنی PDF هم مجاز است (بکند از ۲۰۲۶-۰۹-۰۱). محدودکردن به تصویر،
  // سیاستِ *میدانِ فرم* است و جایش در `useFileUploadList` است نه اینجا.
  const validationError = validateDocumentFile(file);
  if (validationError) throw new Error(validationError);

  // پیشرفتِ ساختگی: بدون آن، نوار پیشرفت هرگز در حالت mock دیده نمی‌شود
  // و باگِ ظاهریِ آن تا روزِ اتصال به سرور پنهان می‌ماند.
  for (const percent of [15, 45, 80, 100]) {
    await delay(90);
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    onProgress?.(percent);
  }

  const objectKey = buildObjectKey(file.name, folder);
  const url = URL.createObjectURL(file);
  bucket.set(objectKey, url);

  return {
    objectKey,
    url,
    fileName: file.name,
    contentType: file.type || null,
    size: file.size,
  };
}

export async function getImageUrl(objectKey) {
  await delay(60);
  return bucket.get(objectKey) ?? null;
}

export async function deleteImage(objectKey) {
  await delay(60);
  const url = bucket.get(objectKey);
  if (!url) return false;

  URL.revokeObjectURL(url);
  bucket.delete(objectKey);
  return true;
}

export async function deleteImages(objectKeys = []) {
  await Promise.allSettled(objectKeys.map((key) => deleteImage(key)));
}
