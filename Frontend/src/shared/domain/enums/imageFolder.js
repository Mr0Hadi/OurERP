/**
 * `ImageFolderEnum` — دسته‌بندیِ تصویر در `POST api/File/UploadImage`.
 *
 * سرور این مقدار را الزامی می‌داند (`IsInEnum`) ولی دیگر در کلیدِ شیء
 * ننشسته: کلید حالا خودِ نامِ فایل است (`logo.png`، و در تصادفِ نام
 * `logo-1.png`). پس فرستادنش لازم است، اما جای فایل در باکت را عوض
 * نمی‌کند.
 *
 * این enum یک مرزِ امنیتی هم نیست. مقادیر باید دقیقاً با اعداد بکند یکی
 * بمانند؛ روی سیم همیشه عدد است.
 */
export const ImageFolderEnum = Object.freeze({
  PRODUCTS: 1,
  CUSTOMERS: 2,
  SUPPLIERS: 3,
  RECEIVING: 4,
});
