import { RETURN_STATUSES } from "./statuses";
import { OFF_SCOPE_KINDS } from "./scopes";

/**
 * کلیدِ یک خط برای جمعِ ادعاها: قلمِ سند، مازادِ همان قلم، یا کالای سفارش‌نداده. مازاد کلیدِ جدا دارد چون از
 * سهمیه‌ی قلم برنمی‌دارد.
 */
export const claimLineKey = ({ orderLineId, offScopeKind, productId }) =>
  offScopeKind === OFF_SCOPE_KINDS.UNLISTED
    ? `p-${productId}`
    : offScopeKind === OFF_SCOPE_KINDS.EXCESS
      ? `x-${orderLineId}`
      : `l-${orderLineId}`;

/**
 * ادعاهای مرجوعی‌های *دیگرِ* یک خرید/فروش برای هر خط، از `otherReturnClaims`ِ خودِ سند (۱۴.۱): اقلامِ
 * `GetPurchaseReceivingInfo` و `unlistedItems`ش، یا اقلامِ `GetSaleDetail`. سرور مرجوعیِ ردشده و لغوشده را
 * نمی‌فرستد؛ مرجوعیِ فعلی (`excludeReturnId`) این‌جا کنار می‌رود. `open*` فقط مرجوعی‌های تسویه‌نشده.
 *
 * @returns `Map<claimLineKey, { quantity, returnNumbers[], openQuantity, openReturnNumbers[] }>`
 */
export function claimsElsewhereOf(order, excludeReturnId = null) {
  const byLine = new Map();
  const add = (key, claim) => {
    if (excludeReturnId != null && claim.returnId === excludeReturnId) return;
    const entry = byLine.get(key) ?? { quantity: 0, returnNumbers: [], openQuantity: 0, openReturnNumbers: [] };
    const quantity = Number(claim.quantity) || 0;
    entry.quantity += quantity;
    if (!entry.returnNumbers.includes(claim.returnNumber)) entry.returnNumbers.push(claim.returnNumber);
    if (claim.status !== RETURN_STATUSES.SETTLED) {
      entry.openQuantity += quantity;
      if (!entry.openReturnNumbers.includes(claim.returnNumber)) entry.openReturnNumbers.push(claim.returnNumber);
    }
    byLine.set(key, entry);
  };

  for (const item of order?.items ?? []) {
    const orderLineId = item.purchaseItemId ?? item.id;
    for (const claim of item.otherReturnClaims ?? []) add(claimLineKey({ orderLineId, offScopeKind: claim.offScopeKind }), claim);
  }
  for (const row of order?.unlistedItems ?? []) {
    for (const claim of row.otherReturnClaims ?? []) {
      add(claimLineKey({ offScopeKind: OFF_SCOPE_KINDS.UNLISTED, productId: row.productId }), claim);
    }
  }
  return byLine;
}
