/**
 * ادعاهایی که کاربر در فرمِ ثبتِ مرجوعی وارد کرده، روی ارقامِ تازه‌ی سرور.
 *
 * سندِ پشتِ فرم ممکن است وسطِ کار عوض شود: خریدِ مازاد از همین صفحه، دورِ
 * دریافت/ارسالِ تازه، یا مرجوعیِ دیگری که همزمان ثبت شد. فرم باید سقف‌های
 * تازه را بگیرد، ولی نوشته‌های کاربر نباید پاک شوند (و پیش‌پر کردنِ دوباره
 * هم نباید کالایی را که همین حالا خریده شد به ادعای مرجوعی برگرداند).
 *
 * پس هر ادعا سرِ جایش می‌ماند و فقط تا سقفِ تازه‌ی گروهش بریده می‌شود — به
 * ترتیبِ خودِ فهرست. ادعایی که مقدارِ مثبت داشت و حالا جایی برایش نمانده
 * حذف می‌شود؛ ادعای صفرِ نیمه‌کاره می‌ماند تا کاربر کاملش کند.
 *
 * @param {Array<{quantity: number}>} claims
 * @param {(claim) => string|number} groupOf کلیدِ گروهی که یک سقف دارد
 * @param {(key) => number} capOf سقفِ تازه‌ی آن گروه
 */
export function clampClaimsToCaps(claims, groupOf, capOf) {
  const used = new Map();
  return claims.flatMap((claim) => {
    const key = groupOf(claim);
    const room = Math.max(0, (Number(capOf(key)) || 0) - (used.get(key) || 0));
    const wanted = Number(claim.quantity) || 0;
    const quantity = Math.min(wanted, room);
    if (wanted > 0 && quantity === 0) return [];
    used.set(key, (used.get(key) || 0) + quantity);
    return [{ ...claim, quantity }];
  });
}

/** ادعاهای «روی سفارش»ِ خطوطِ قبلی، روی خطوطِ تازه (هم‌کلید با `orderLineId`). */
export function carryOverLineClaims(previousLines, nextLines) {
  const previous = new Map(
    previousLines.map((line) => [line.orderLineId, line.claims || []]),
  );
  return nextLines.map((line) => ({
    ...line,
    claims: clampClaimsToCaps(
      previous.get(line.orderLineId) || [],
      () => line.orderLineId,
      () => line.maxReturnableQuantity,
    ),
  }));
}
