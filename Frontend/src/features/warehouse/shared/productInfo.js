/**
 * تصویر، برند و ردیابی‌پذیریِ کالا روی ردیف‌های فرمِ انبار (قلمِ دریافت/ارسال، دورِ کالای مرجوعی).
 * از ۲۰۲۶-۱۰-۳۰ خودِ ردیف‌های سند این‌ها را دارند (`SaleItemDto`، اقلامِ `GetPurchaseReceivingInfo`،
 * `pendingEffects` و `effects`ِ مرجوعی — بندِ ۱۵.۱)؛ پس درخواستِ جدا برای هر کالا لازم نیست.
 */

/**
 * `Map<productId, row>` از ردیف‌های سند. ردیفی که `requiresUnitTracking` ندارد (اثرِ پولی) کنار می‌رود.
 * @param {...object[]} lists ردیف‌های خامِ سرور
 */
export function documentProductMap(...lists) {
  const map = new Map();
  for (const row of lists.flat()) {
    if (row?.productId == null || row.requiresUnitTracking == null) continue;
    map.set(Number(row.productId), row);
  }
  return map;
}

/** همه‌ی اثرهای یک سندِ مرجوعی (`claims → resolutions → effects`). */
export const returnEffectsOf = (returnDoc) =>
  (returnDoc?.claims ?? []).flatMap((claim) => (claim.resolutions ?? []).flatMap((resolution) => resolution.effects ?? []));

export function withProductInfo(rows, productMap) {
  return rows.map((row) => {
    const product = productMap.get(Number(row.productId));
    return {
      ...row,
      imageKey: product?.imageKey ?? null,
      imageUrl: product?.imageUrl ?? null,
      brand: product?.brand || "",
    };
  });
}

/** `(productId) => bool` — کالای ردیابی‌پذیر اسکنِ تک‌تکِ دانه‌ها را لازم دارد. */
export const trackedLookup = (productMap) => (productId) =>
  Boolean(productMap.get(Number(productId))?.requiresUnitTracking);
