// src/features/purchases/returns/services/apiMapping.js

/**
 * تنها نقطه‌ی ترجمه بین نامِ فرانت و نامِ بک‌اند در مرجوعی خرید.
 *
 * فرانت خطِ سند را در همه‌جا `orderLineId` صدا می‌زند — نامی خنثی که
 * هم برای فاکتور فروش کار می‌کند و هم برای سفارش خرید، و به همین دلیل
 * کامپوننت‌های مشترک (`ClaimsSection`, `buildGoodsLines`, ...) بدون
 * هیچ شرطِ سمت‌به‌سمت کار می‌کنند.
 *
 * بک‌اند اما هر سمت را با نامِ خودش می‌شناسد (`SaleItemId` /
 * `PurchaseItemId`). ترجمه عمداً *فقط* اینجاست: اگر در کامپوننت‌ها
 * پخش شود، هر تغییری در قرارداد به ده فایل سرایت می‌کند.
 *
 * بقیه‌ی سندِ مرجوعی (ادعا، تصمیم، اثر) بدون ترجمه رد می‌شود — قرارداد
 * همان مدلی است که فرانت دارد و بک‌اند قرار است به آن مهاجرت کند
 * (`docs/returns/phase1-analysis.fa.md`).
 */

export function toApiClaim(claim) {
  return {
    purchaseItemId: claim.orderLineId ?? null,
    scope: claim.scope,
    offScopeKind: claim.offScopeKind ?? null,
    productId: claim.productId ?? null,
    productName: claim.productName ?? "",
    unit: claim.unit ?? "",
    unitPrice: Number(claim.unitPrice) || 0,
    qty: Number(claim.qty) || 0,
    problem: claim.problem,
    note: claim.note || "",
  };
}

function fromApiClaim(claim) {
  return {
    ...claim,
    orderLineId: claim.orderLineId ?? claim.purchaseItemId ?? null,
  };
}

export function fromApiReturn(doc) {
  if (!doc) return doc;
  return { ...doc, claims: (doc.claims || []).map(fromApiClaim) };
}
