// src/shared/domain/enums/imageFolder.js

/**
 * `ImageFolderEnum` — پیشوندِ پوشه‌ی شیء در باکت (بخش ۱۷ سند api-guide.fa.md).
 *
 * این enum یک مرزِ امنیتی نیست؛ فقط تعیین می‌کند فایل زیر کدام پوشه‌ی
 * منطقی ذخیره شود تا تصاویرِ هر فیچر جداگانه قابل مرور و پاک‌سازی بماند.
 * مقادیر باید دقیقاً با اعداد بکند یکی بمانند؛ روی سیم همیشه عدد است.
 */
export const ImageFolderEnum = Object.freeze({
  PRODUCTS: 1,
  CUSTOMERS: 2,
  SUPPLIERS: 3,
  RECEIVING: 4,
});

/** برچسب فارسی هر عضو، فقط برای نمایش در UI. */
export const IMAGE_FOLDER_LABELS = Object.freeze({
  [ImageFolderEnum.PRODUCTS]: "محصولات",
  [ImageFolderEnum.CUSTOMERS]: "مشتریان",
  [ImageFolderEnum.SUPPLIERS]: "تامین‌کنندگان",
  [ImageFolderEnum.RECEIVING]: "رسید کالا",
});

export function imageFolderLabelOf(folder) {
  return IMAGE_FOLDER_LABELS[folder] ?? "";
}

/** آیا عدد داده‌شده عضوِ معتبرِ enum است — پیش از فرستادن به سرور. */
export function isValidImageFolder(folder) {
  return Object.values(ImageFolderEnum).includes(Number(folder));
}
