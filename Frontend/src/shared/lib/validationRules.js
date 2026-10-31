import { isValidIranPhone } from "@/shared/lib/iranianMobile";

/**
 * قوانین اعتبارسنجیِ مشترکِ فرم‌ها — آینه‌ی `Common/Extensions/Validation.cs`
 * در بکند.
 *
 * چرا اینجا و نه داخل فیچر: این قوانین *قرارداد سرور* هستند، نه قاعده‌ی
 * دامنه‌ی یک فیچر. سرور همین regexها را روی `CreateUser`، `ForgetPassword`
 * و `ChangePassword` اجرا می‌کند؛ اگر هر فرم نسخه‌ی خودش را بنویسد،
 * کاربر خطای سمت سرور می‌گیرد در حالی که فرم سبز بوده — و روزی که سرور
 * قانون را عوض کند باید چند جا دست بخورد.
 *
 * پیام‌ها هم عمداً هم‌متنِ پیام‌های سرورند تا کاربر دو بیانِ متفاوت از یک
 * خطا نبیند.
 */

/** `Validation.IsPersianText` — فقط حروف فارسی، کلمات جداشده با یک فاصله. */
const PERSIAN_TEXT = /^[؀-ۿ]+(?: [؀-ۿ]+)*$/;

/** `Validation.IsEnglishText` — حروف انگلیسی، رقم، فاصله، زیرخط و خط تیره. */
const ENGLISH_TEXT = /^[A-Za-z\s\d_-]+$/;

const PASSWORD_ALLOWED = /^[a-zA-Z0-9!@#$%^&*()_\-+=[\]{}|\\:;"'<>,.?/~`]+$/;
const PASSWORD_SPECIAL = /[!@#$%^&*()_\-+=[\]{}|\\:;"'<>,.?/~`]/;

const isPersianText = (value) => PERSIAN_TEXT.test(value ?? "");

const isEnglishText = (value) => ENGLISH_TEXT.test(value ?? "");

const isValidPassword = (value) => {
  const password = value ?? "";
  return (
    password.length >= 8 &&
    PASSWORD_ALLOWED.test(password) &&
    /[a-zA-Z]/.test(password) &&
    /\d/.test(password) &&
    PASSWORD_SPECIAL.test(password)
  );
};

/** `Validation.RequiredMessage` — همان متن سرور. */
export const requiredMessage = (fieldName) => `لطفا ${fieldName} را وارد نمایید`;

export const PASSWORD_RULE_MESSAGE =
  "رمز عبور باید حداقل ۸ کاراکتر باشد و شامل حرف انگلیسی، عدد و یک کاراکتر خاص باشد";

// ─── قوانین آماده‌ی react-hook-form ─────────────────────────────────────────

/** فیلد متنیِ اجباریِ فارسی (نام، نام خانوادگی و مانند آن). */
export const persianNameRules = (fieldName) => ({
  required: requiredMessage(fieldName),
  validate: (value) =>
    isPersianText(value?.trim()) || `${fieldName} فقط باید حروف فارسی باشد`,
});

/**
 * نامِ اختیاریِ یک شخص که با فیلدِ دیگری جفت است (نام و نام خانوادگیِ
 * مسئولِ تامین‌کننده): هر دو خالی مجاز است، ولی اگر یکی پر شد دیگری هم
 * لازم است، و هر کدام فقط حروف فارسی.
 */
export const optionalPersonNameRules = (fieldName, pairedField) => ({
  validate: (value, formValues) => {
    const trimmed = value?.trim();
    if (!trimmed) {
      return formValues?.[pairedField]?.trim()
        ? requiredMessage(fieldName)
        : true;
    }
    return isPersianText(trimmed) || `${fieldName} فقط باید حروف فارسی باشد`;
  },
});

/**
 * شماره‌ی موبایلِ اجباری. سرور روی مشتری/تامین‌کننده *فقط موبایل* را
 * می‌پذیرد و شماره‌ی ثابت را رد می‌کند.
 */
export const mobileRules = (fieldName = "شماره تماس") => ({
  required: requiredMessage(fieldName),
  validate: (value) =>
    isValidIranPhone(value) || "شماره تماس وارد شده صحیح نمی باشد.",
});

/** نام کاربری — سرور فقط حروف انگلیسی/رقم/`_`/`-` را می‌پذیرد. */
export const usernameRules = (fieldName = "نام کاربری") => ({
  required: requiredMessage(fieldName),
  validate: (value) =>
    isEnglishText(value?.trim()) || `${fieldName} وارد شده معتبر نیست`,
});

/**
 * شرط‌های رمز، تک‌تک — برای فهرستِ زنده‌ی زیرِ فیلد («۸ کاراکتر ✓»)؛ همان شرط‌های
 * `isValidPassword`. نویسه‌ی غیرمجاز (فارسی، فاصله) جدا گزارش می‌شود.
 */
export function passwordChecks(value) {
  const password = value ?? "";
  return [
    { key: "length", label: "حداقل ۸ کاراکتر", ok: password.length >= 8 },
    { key: "letter", label: "حرف انگلیسی", ok: /[a-zA-Z]/.test(password) },
    { key: "digit", label: "عدد", ok: /\d/.test(password) },
    { key: "special", label: "یک نویسه‌ی خاص (مثل ! @ #)", ok: PASSWORD_SPECIAL.test(password) },
    {
      key: "allowed",
      label: "فقط حروف و نویسه‌های انگلیسی، بی فاصله",
      ok: password === "" || PASSWORD_ALLOWED.test(password),
    },
  ];
}

export const passwordRules = (fieldName = "رمز عبور") => ({
  required: requiredMessage(fieldName),
  validate: (value) => isValidPassword(value) || PASSWORD_RULE_MESSAGE,
});
