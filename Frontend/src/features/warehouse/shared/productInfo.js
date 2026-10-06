/**
 * تصویر و برندِ کالا روی ردیف‌های فرمِ انبار (قلمِ دریافت/ارسال، دورِ کالای
 * مرجوعی) از `useDocumentProducts`. خودِ سند این‌ها را ندارد (بندِ ۱۵.۱).
 */
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
