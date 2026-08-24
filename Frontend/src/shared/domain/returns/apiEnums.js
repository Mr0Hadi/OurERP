// src/shared/domain/returns/apiEnums.js

import { EFFECT_KINDS, EFFECT_STATUSES, PAYMENT_METHODS } from "./effects";
import { RETURN_PROBLEMS } from "./problems";
import { CLAIM_SCOPES, OFF_SCOPE_KINDS } from "./scopes";
import { RETURN_STATUSES } from "./statuses";

/**
 * فهرستِ کاملِ فیلدهای enum‌داری که در سندِ مرجوعی از سرور می‌آیند.
 *
 * چرا این فایل وجود دارد:
 *
 * ۱. **مرزِ صریح.** این فیلدها در سه سطح تودرتو پخش‌اند (ادعا → تصمیم
 *    → اثر → دورِ کالا → مشاهده). بدون یک فهرستِ یک‌جا، هرکس بخواهد
 *    قرارداد را عوض کند باید تمام درخت را بگردد.
 *
 * ۲. **شکستِ زودهنگام.** اگر سرور مقداری بفرستد که فرانت نمی‌شناسد —
 *    یک عدد به‌جای رشته، یک `PascalCase` به‌جای `snake_case`، یا یک
 *    عضوِ تازه که فرانت هنوز نمی‌شناسد — بدون این وارسی، هیچ خطایی رخ
 *    نمی‌دهد: فقط یک بجِ خالی یا یک برچسبِ خام روی صفحه می‌نشیند و
 *    کسی متوجه نمی‌شود. با این وارسی، همان لحظه در کنسول با نامِ فیلد
 *    و مقدار گزارش می‌شود.
 *
 * ۳. مقادیر همین‌جا (effects.js/problems.js/scopes.js/statuses.js) حالا
 *    عددی‌اند، ولی بکند هنوز این enum های مرجوعی را ندارد — نه شماره‌ها
 *    لزوماً با آنچه بکند روزی اضافه می‌کند یکی خواهد بود، نه حتی خودِ
 *    مدل (بکند enum های بسته دارد؛ اینجا مدلِ ترکیبیِ effect است). روز
 *    اتصال، این‌جا دقیقاً همان‌جایی است که باید نگاشت اضافه شود.
 *
 * وارسی فقط در حالت توسعه اجرا می‌شود و هرگز چیزی را نمی‌شکند یا
 * تغییر نمی‌دهد؛ کارش فقط گزارش‌کردن است.
 */

const valuesOf = (enumObject) => new Set(Object.values(enumObject));

const RETURN_STATUS_VALUES = valuesOf(RETURN_STATUSES);
const PROBLEM_VALUES = valuesOf(RETURN_PROBLEMS);
const SCOPE_VALUES = valuesOf(CLAIM_SCOPES);
const OFF_SCOPE_KIND_VALUES = valuesOf(OFF_SCOPE_KINDS);
const EFFECT_KIND_VALUES = valuesOf(EFFECT_KINDS);
const EFFECT_STATUS_VALUES = valuesOf(EFFECT_STATUSES);
const PAYMENT_METHOD_VALUES = valuesOf(PAYMENT_METHODS);

/** مسیرِ هر فیلدِ enum در سندِ مرجوعی، برای مستندشدن و برای وارسی. */
export const RETURN_ENUM_FIELDS = [
  ["status", RETURN_STATUS_VALUES],
  ["claims[].scope", SCOPE_VALUES],
  ["claims[].offScopeKind", OFF_SCOPE_KIND_VALUES],
  ["claims[].problem", PROBLEM_VALUES],
  ["claims[].resolutions[].effects[].kind", EFFECT_KIND_VALUES],
  ["claims[].resolutions[].effects[].status", EFFECT_STATUS_VALUES],
  ["claims[].resolutions[].effects[].method", PAYMENT_METHOD_VALUES],
  ["claims[].resolutions[].effects[].history[].observations[].problem", PROBLEM_VALUES],
];

const reported = new Set();

function verify(path, value, allowed) {
  // تهی مجاز است: `offScopeKind` و `method` عمداً می‌توانند null باشند.
  if (value == null || allowed.has(value)) return;

  const signature = `${path}=${value}`;
  if (reported.has(signature)) return;
  reported.add(signature);

  const hint =
    typeof value === "string"
      ? "سرور enum را رشته‌ای فرستاده؛ قرارداد فرانت عددی است."
      : "مقدار در فضای مقدارِ فرانت تعریف نشده است.";

  console.error(
    `[returns] مقدار enum ناشناخته در «${path}»: ${JSON.stringify(value)} — ${hint}`,
  );
}

/**
 * سندِ مرجوعی را می‌گردد و هر مقدار enum را با فضای مقدارِ فرانت
 * می‌سنجد. خروجی ندارد؛ سند دست‌نخورده می‌ماند.
 */
export function verifyReturnEnums(doc) {
  if (!doc) return;

  verify("status", doc.status, RETURN_STATUS_VALUES);

  (doc.claims || []).forEach((claim) => {
    verify("claims[].scope", claim.scope, SCOPE_VALUES);
    verify("claims[].offScopeKind", claim.offScopeKind, OFF_SCOPE_KIND_VALUES);
    verify("claims[].problem", claim.problem, PROBLEM_VALUES);

    (claim.resolutions || []).forEach((resolution) => {
      (resolution.effects || []).forEach((effect) => {
        verify("effects[].kind", effect.kind, EFFECT_KIND_VALUES);
        verify("effects[].status", effect.status, EFFECT_STATUS_VALUES);
        verify("effects[].method", effect.method, PAYMENT_METHOD_VALUES);

        (effect.history || []).forEach((round) => {
          (round.observations || []).forEach((observation) => {
            verify("observations[].problem", observation.problem, PROBLEM_VALUES);
          });
        });
      });
    });
  });
}
