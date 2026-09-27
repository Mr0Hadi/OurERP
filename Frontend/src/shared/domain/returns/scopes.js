import { toneSoft } from "@/shared/lib/tone";

/**
 * دامنه‌ی ادعا — مشترک بین مرجوعی فروش و مرجوعی خرید.
 *
 * ادعا یا روی یک خطِ سند می‌نشیند (سقفش مقداری است که واقعاً جابه‌جا
 * شده)، یا اصلاً بیرون از سند است.
 *
 * مثل `problems.js` مقدارها یک‌بار تعریف می‌شوند و هر سمت فقط *برچسب*
 * را عوض می‌کند — «روی فاکتور» در فروش، «روی سفارش» در خرید — تا کدِ
 * مشترک بتواند روی یک فضای مقدار شرط بگذارد.
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
  [OFF_SCOPE_KINDS.EXCESS]: toneSoft("info"),
  [OFF_SCOPE_KINDS.UNLISTED]: toneSoft("special"),
};

/** ادعای خارج از سند سهمیه‌ی هیچ خطی را مصرف نمی‌کند. */
export function isOffScope(claim) {
  return claim?.scope === CLAIM_SCOPES.OFF_ORDER;
}
