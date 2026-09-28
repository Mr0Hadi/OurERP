/**
 * تبدیلِ هر خطا به یک پیامِ فارسیِ قابل‌نمایش برای کاربر.
 *
 * چرا لازم است: الگوی قدیمیِ `error.message || "خطا در ..."` تقریباً هیچ‌وقت
 * به متنِ فارسیِ پشتیبان نمی‌رسید، چون axios همیشه `message` را پر می‌کند —
 * با متن‌های انگلیسی مثل `Network Error` یا `Request failed with status code 500`.
 * نتیجه این بود که در قطعیِ شبکه یا خطای سرور، کاربر پیامِ انگلیسی می‌دید.
 *
 * ترتیبِ انتخابِ پیام:
 *   ۱. پیامی که خودِ سرور فرستاده (`error.serverMessage`، در اینترسپتورِ axios پر می‌شود)
 *   ۲. علتی که از پیامِ عملیات مشخص‌تر است: قطع شبکه، تایم‌اوت، نداشتنِ دسترسی و …
 *   ۳. متنِ اختصاصیِ همان عملیات (`fallback`)، مثل «خطا در ثبت خرید»
 *   ۴. پیامِ عمومیِ متناسب با کدِ وضعیت
 */

export const ERROR_MESSAGES = Object.freeze({
  NETWORK:
    "ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.",
  TIMEOUT: "پاسخ سرور بیش از حد طول کشید. لطفاً دوباره تلاش کنید.",
  CANCELED: "درخواست لغو شد.",
  UNAUTHORIZED: "نشست شما به پایان رسیده است. لطفاً دوباره وارد شوید.",
  FORBIDDEN: "شما دسترسی لازم برای انجام این کار را ندارید.",
  NOT_FOUND: "مورد درخواستی پیدا نشد؛ ممکن است حذف شده باشد.",
  // ۴۰۹ فقط از میان‌افزارِ Idempotency-Key می‌آید: همین درخواست هنوز روی سرور
  // در حال اجراست (بعد از چند retry در QueryProvider به کاربر می‌رسد).
  CONFLICT:
    "درخواست قبلی شما هنوز در حال پردازش است. چند لحظه بعد صفحه را به‌روز کنید.",
  PAYLOAD_TOO_LARGE: "حجم فایل یا اطلاعات ارسالی بیش از حد مجاز است.",
  TOO_MANY_REQUESTS: "تعداد درخواست‌ها زیاد است. چند لحظه بعد دوباره تلاش کنید.",
  INVALID_INPUT: "اطلاعات واردشده معتبر نیست. لطفاً فیلدها را بررسی کنید.",
  SERVER: "خطایی در سرور رخ داد. چند لحظه بعد دوباره تلاش کنید.",
  UNKNOWN: "خطای پیش‌بینی‌نشده‌ای رخ داد. لطفاً دوباره تلاش کنید.",
});

// حروف فارسی/عربی. پیامی که هیچ حرف فارسی ندارد تقریباً همیشه متنِ فنیِ
// یک exception است (مثل `Object reference not set...`)، نه پیامی برای کاربر.
const PERSIAN_LETTER = /[\u0600-\u06FF]/;

/** پیامِ سرور فقط وقتی قابل نمایش است که متنِ فارسی باشد. */
export function isUserFacingMessage(message) {
  return typeof message === "string" && PERSIAN_LETTER.test(message);
}

/**
 * پیامِ سرور را از بدنه‌ی پاسخِ خطا بیرون می‌کشد.
 *
 * بک‌اند دو شکل برمی‌گرداند: پوششِ `ResponseDto` (`{ Data, Message }`) و
 * `ProblemDetails`ِ ASP.NET برای خطای اعتبارسنجی (`{ title, errors: { field: [...] } }`).
 * در دومی `title` انگلیسی است ("One or more validation errors occurred")،
 * پس اولین پیامِ داخلِ `errors` ترجیح داده می‌شود.
 */
export function extractServerMessage(body) {
  if (body == null || typeof body !== "object") return null;

  const candidates = [body.Message, body.message];
  const fieldErrors = body.errors ?? body.Errors;
  if (fieldErrors && typeof fieldErrors === "object") {
    for (const messages of Object.values(fieldErrors)) {
      candidates.push(Array.isArray(messages) ? messages[0] : messages);
    }
  }
  candidates.push(body.title);

  return candidates.find(isUserFacingMessage) ?? null;
}

function transportMessage(error) {
  if (error.code === "ERR_CANCELED") return ERROR_MESSAGES.CANCELED;
  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    return ERROR_MESSAGES.TIMEOUT;
  }
  return ERROR_MESSAGES.NETWORK;
}

// کدهایی که علتشان از پیامِ عملیات برای کاربر مفیدتر است.
const SPECIFIC_STATUS_MESSAGES = {
  401: ERROR_MESSAGES.UNAUTHORIZED,
  403: ERROR_MESSAGES.FORBIDDEN,
  413: ERROR_MESSAGES.PAYLOAD_TOO_LARGE,
  429: ERROR_MESSAGES.TOO_MANY_REQUESTS,
};

function genericStatusMessage(status) {
  if (status === 404) return ERROR_MESSAGES.NOT_FOUND;
  if (status === 409) return ERROR_MESSAGES.CONFLICT;
  if (status === 400 || status === 422) return ERROR_MESSAGES.INVALID_INPUT;
  if (status >= 500) return ERROR_MESSAGES.SERVER;
  return ERROR_MESSAGES.UNKNOWN;
}

/**
 * پیامِ فارسیِ مناسبِ نمایش برای یک خطا.
 *
 * @param {unknown} error خطای axios، خطای معمولیِ JS یا هر چیز دیگر
 * @param {string} [fallback] متنِ اختصاصیِ عملیات، مثل «خطا در حذف مشتری»
 * @returns {string}
 */
export function getErrorMessage(error, fallback) {
  if (!error) return fallback ?? ERROR_MESSAGES.UNKNOWN;

  if (error.serverMessage) return error.serverMessage;

  if (error.isAxiosError) {
    const status = error.response?.status;
    if (!status) return transportMessage(error);
    return (
      SPECIFIC_STATUS_MESSAGES[status] ?? fallback ?? genericStatusMessage(status)
    );
  }

  // خطاهایی که خودِ فرانت با متن فارسی ساخته (`throw new Error("...")`).
  if (isUserFacingMessage(error.message)) return error.message;
  return fallback ?? ERROR_MESSAGES.UNKNOWN;
}
