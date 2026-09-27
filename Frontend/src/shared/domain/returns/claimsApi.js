import { verifyReturnEnums } from "./apiEnums";

/**
 * مرزِ سندِ مرجوعی (خرید و فروش) با سرور.
 *
 * خطِ سند در کلِ فرانت یک نام دارد: `orderLineId` — همان نامی که بدنه‌ی نوشتنِ
 * بکند (`CreateReturnClaimDto.OrderLineId`) برای هر دو سمت می‌خواهد. پاسخِ
 * خواندنِ بکند اما همان مقدار را `purchaseItemId`/`saleItemId` می‌نامد؛ تا
 * بکند `OrderLineId` را در پاسخِ خواندن هم بدهد (سندِ frontend-requests.fa.md)،
 * فقط همین یک فیلد هنگامِ خواندن نگاشت می‌شود.
 */

/**
 * ادعای فرم → `CreateReturnClaimDto`.
 *
 * عددها صریح عدد می‌شوند: ورودی‌های فرم رشته‌اند و System.Text.Json رشته را
 * به عدد bind نمی‌کند (۴۰۰). `productName`/`unit` فرستاده نمی‌شوند؛ بکند از
 * روی `productId` پرشان می‌کند.
 */
export function toApiClaim(claim) {
  return {
    orderLineId: claim.orderLineId ?? null,
    scope: claim.scope,
    offScopeKind: claim.offScopeKind ?? null,
    productId: claim.productId ?? null,
    unitPrice: Number(claim.unitPrice) || 0,
    quantity: Number(claim.quantity) || 0,
    problem: claim.problem,
    note: claim.note || "",
  };
}

function fromApiReturn(doc, lineIdKey) {
  if (!doc) return doc;
  // در حالتِ توسعه، enumها با فضای مقدارِ فرانت سنجیده می‌شوند تا ناهماهنگیِ
  // قرارداد همان لحظه در کنسول دیده شود، نه به‌صورتِ یک برچسبِ خالی روی صفحه.
  if (import.meta.env?.DEV) verifyReturnEnums(doc);
  return {
    ...doc,
    claims: (doc.claims || []).map((claim) => ({
      ...claim,
      orderLineId: claim.orderLineId ?? claim[lineIdKey] ?? null,
    })),
  };
}

export const fromApiPurchaseReturn = (doc) => fromApiReturn(doc, "purchaseItemId");
export const fromApiSaleReturn = (doc) => fromApiReturn(doc, "saleItemId");
