// src/features/purchases/returns/services/apiMapping.js

/**
 * مرزِ سندِ مرجوعی خرید با سرور.
 *
 * خطِ سند در *کل* قرارداد یک نام دارد: `orderLineId`. نامی خنثی که هم
 * برای فاکتور فروش کار می‌کند و هم برای سفارش خرید — و به همین دلیل
 * کامپوننت‌ها و دامنه‌ی مشترک (`ClaimsSection`, `buildGoodsLines`,
 * `orderContext`) بدون هیچ شرطِ سمت‌به‌سمت کار می‌کنند.
 *
 * عمداً دو نامِ متفاوت برای دو سمت نداریم: هر جفت‌نامی یعنی یک ترجمه،
 * و هر ترجمه‌ای یعنی جایی که می‌شود اشتباه کرد. اینکه ستونِ بک‌اند
 * `SaleItemId` یا `PurchaseItemId` نام دارد، جزئیاتِ ذخیره‌سازیِ آن
 * سمت است و به قرارداد ربطی ندارد.
 *
 * برای همین این ماژول تقریباً خالی است و این نشانه‌ی خوبی است. فقط
 * خواندنِ `purchaseItemId` را هم تحمل می‌کند تا اگر سرور موقتاً نام
 * قدیمی را فرستاد، صفحه سفید نشود.
 */

import { verifyReturnEnums } from "@/shared/domain/returns/apiEnums";

export function toApiClaim(claim) {
  return {
    orderLineId: claim.orderLineId ?? null,
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
  // در حالت توسعه، مقادیر enum با فضای مقدارِ فرانت سنجیده می‌شوند تا
  // ناهماهنگیِ قرارداد همان لحظه در کنسول دیده شود، نه به‌صورت یک بجِ
  // خالی روی صفحه.
  if (import.meta.env?.DEV) verifyReturnEnums(doc);
  return { ...doc, claims: (doc.claims || []).map(fromApiClaim) };
}
