/**
 * مرزِ سندِ مرجوعی فروش با سرور.
 *
 * خطِ سند در *کل* قرارداد یک نام دارد: `orderLineId`. نامی خنثی که هم
 * برای فاکتور فروش کار می‌کند و هم برای سفارش خرید — و به همین دلیل
 * کامپوننت‌ها و دامنه‌ی مشترک (`ClaimsSection`, `buildGoodsLines`)
 * بدون هیچ شرطِ سمت‌به‌سمت کار می‌کنند.
 *
 * عمداً دو نامِ متفاوت برای دو سمت نداریم: هر جفت‌نامی یعنی یک ترجمه،
 * و هر ترجمه‌ای یعنی جایی که می‌شود اشتباه کرد. اینکه ستونِ بک‌اند
 * `SaleItemId` یا `PurchaseItemId` نام دارد، جزئیاتِ ذخیره‌سازیِ آن
 * سمت است و به قرارداد ربطی ندارد.
 *
 * تنها نقطه‌ی ناهمنامی، خودِ بکند است و نه انتخابِ ما: بدنه‌ی نوشتن
 * `OrderLineId` می‌خواهد ولی پاسخِ خواندن همان مقدار را `saleItemId`
 * صدا می‌زند. یک نام نمی‌تواند هر دو باشد، پس نامِ نوشتن (که قرارداد
 * مشترکِ دو سمت است) نگه داشته می‌شود و `saleItemId` فقط هنگام
 * خواندن به آن نگاشت می‌شود — این fallbackِ قدیمی نیست، تنها نامی است
 * که سرور امروز می‌فرستد.
 */

import { verifyReturnEnums } from "@/shared/domain/returns/apiEnums";

export function toApiClaim(claim) {
  return {
    orderLineId: claim.orderLineId ?? null,
    scope: claim.scope,
    offScopeKind: claim.offScopeKind ?? null,
    productId: claim.productId ?? null,
    // `productName`/`unit` عمداً فرستاده نمی‌شوند: `CreateReturnClaimDto`
    // ندارَدشان و بکند از روی `productId` خودش پرشان می‌کند.
    unitPrice: Number(claim.unitPrice) || 0,
    quantity: Number(claim.quantity) || 0,
    problem: claim.problem,
    note: claim.note || "",
  };
}

function fromApiClaim(claim) {
  return {
    ...claim,
    orderLineId: claim.orderLineId ?? claim.saleItemId ?? null,
  };
}

export function fromApiReturn(doc) {
  if (!doc) return doc;
  // در حالت توسعه، مقادیر enum با فضای مقدارِ فرانت سنجیده می‌شوند تا
  // ناهماهنگیِ قرارداد همان لحظه در کنسول دیده شود، نه به‌صورت یک بجِ
  // خالی روی صفحه.
  if (import.meta.env?.DEV) verifyReturnEnums(doc);
  return { ...doc, claims: (doc.claims || []).map(fromApiClaim) };
}
