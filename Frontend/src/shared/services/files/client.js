// src/shared/services/files/client.js

import * as mockApi from "./api-mock";
import * as realApi from "./api-v1";

/**
 * تنها جایی که تصمیم گرفته می‌شود تصاویر از سرور بیایند یا از mock.
 *
 * فیچرها این انتخاب را در خودشان دارند (`api-mockData` در برابر
 * `api-v1`)، ولی کارِ فایل *سراسری* است: یک هوکِ مشترک نمی‌تواند هر بار
 * import را عوض کند. پس سوییچ به یک پرچمِ محیطی سپرده شده — همان
 * `VITE_ENABLE_MOCK_API` که در `.env.example` از قبل تعریف شده بود.
 *
 * پیش‌فرض سرورِ واقعی است: mock باید یک انتخابِ صریحِ توسعه‌دهنده باشد،
 * نه چیزی که ناخواسته به production برسد.
 */
export const USE_MOCK_FILE_API =
  String(import.meta.env?.VITE_ENABLE_MOCK_API).toLowerCase() === "true";

const impl = USE_MOCK_FILE_API ? mockApi : realApi;

export const uploadImage = (...args) => impl.uploadImage(...args);
export const getImageUrl = (...args) => impl.getImageUrl(...args);
export const deleteImage = (...args) => impl.deleteImage(...args);
export const deleteImages = (...args) => impl.deleteImages(...args);

// نرمال‌سازیِ کلید یک تابعِ خالص است و به mock/سرور ربطی ندارد.
export { objectKeyOf } from "./objectKey";
