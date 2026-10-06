import { extractServerMessage } from "@/shared/lib/errorMessage";

/**
 * خطای درخواستی که با `responseType: "blob"` رفته بود.
 *
 * خطا همچنان JSONِ استانداردِ سرور است، ولی چون بدنه Blob آمده، اینترسپتورِ
 * axios نمی‌تواند پیامِ فارسی را بیرون بکشد؛ این‌جا باز می‌شود و روی
 * `error.serverMessage` می‌نشیند تا `getErrorMessage` مثلِ بقیه‌ی خطاها کار کند.
 */
export async function unwrapBlobError(error) {
  const body = error?.response?.data;
  if (!(body instanceof Blob)) throw error;

  try {
    const message = extractServerMessage(JSON.parse(await body.text()));
    if (message) {
      error.serverMessage = message;
      error.message = message;
    }
  } catch {
    // بدنه‌ی غیر JSON (مثلاً صفحه‌ی خطای پروکسی) — پیامِ عمومیِ اینترسپتور می‌ماند.
  }

  throw error;
}
