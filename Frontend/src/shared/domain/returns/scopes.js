// src/shared/domain/returns/scopes.js

/**
 * دامنه‌ی ادعا — مشترک بین مرجوعی فروش و مرجوعی خرید.
 *
 * ادعا یا روی یک خطِ سند می‌نشیند (و سقفش مقداری است که واقعاً
 * جابه‌جا شده)، یا اصلاً بیرون از سند است.
 *
 * مثل `problems.js`، مقدارها اینجا یک‌بار تعریف می‌شوند و هر سمت فقط
 * *برچسب*ش را عوض می‌کند: «روی فاکتور» در فروش و «روی سفارش» در خرید.
 * پیش از این هر سمت مقدار خودش را داشت (`on_invoice` در برابر
 * `on_order`) در حالی که معنایشان یکی بود — یعنی یک فیلدِ واحد در
 * قرارداد API دو فضای مقدار داشت و کدِ مشترک نمی‌توانست رویش شرط
 * بگذارد.
 */

// بدون معادل در بکند — تفکیک «روی سند» / «خارج از سند» مفهومی خودِ
// فرانت است.
export const CLAIM_SCOPES = {
  ON_ORDER: 0,
  OFF_ORDER: 1,
};

/**
 * وقتی ادعا خارج از سند است، دو حالت دارد که رفتار قیمتی‌شان فرق
 * می‌کند: `excess` قیمت واحدِ همان خط سند را دارد، `unlisted` باید
 * قیمتش از کالا خوانده یا دستی وارد شود (چون خط سندی ندارد).
 */
export const OFF_SCOPE_KINDS = {
  EXCESS: 0,
  UNLISTED: 1,
};

export const OFF_SCOPE_KIND_STYLES = {
  [OFF_SCOPE_KINDS.EXCESS]:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-400",
  [OFF_SCOPE_KINDS.UNLISTED]:
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:border-violet-800 dark:text-violet-400",
};

/** ادعای خارج از سند سهمیه‌ی هیچ خطی را مصرف نمی‌کند. */
export function isOffScope(claim) {
  return claim?.scope === CLAIM_SCOPES.OFF_ORDER;
}
