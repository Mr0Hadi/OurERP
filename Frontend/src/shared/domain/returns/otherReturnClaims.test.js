import { describe, expect, it } from "vitest";
import { RETURN_STATUSES } from "./statuses";
import { OFF_SCOPE_KINDS } from "./scopes";
import { claimLineKey, claimsElsewhereOf } from "./otherReturnClaims";

const claim = (returnId, quantity, patch = {}) => ({
  returnId,
  returnNumber: `RET-${returnId}`,
  status: RETURN_STATUSES.OPEN,
  offScopeKind: null,
  quantity,
  ...patch,
});

describe("ادعاهای مرجوعی‌های دیگر از otherReturnClaimsِ سند", () => {
  it("قلم، مازادِ همان قلم و کالای سفارش‌نداده کلیدِ جدا دارند", () => {
    const order = {
      items: [
        {
          purchaseItemId: 5,
          otherReturnClaims: [claim(1, 2), claim(2, 1, { status: RETURN_STATUSES.SETTLED }), claim(3, 4, { offScopeKind: OFF_SCOPE_KINDS.EXCESS })],
        },
      ],
      unlistedItems: [{ productId: 9, otherReturnClaims: [claim(1, 3, { offScopeKind: OFF_SCOPE_KINDS.UNLISTED })] }],
    };
    const map = claimsElsewhereOf(order);
    expect(map.get(claimLineKey({ orderLineId: 5 }))).toEqual({
      quantity: 3,
      returnNumbers: ["RET-1", "RET-2"],
      openQuantity: 2,
      openReturnNumbers: ["RET-1"],
    });
    expect(map.get(claimLineKey({ orderLineId: 5, offScopeKind: OFF_SCOPE_KINDS.EXCESS })).quantity).toBe(4);
    expect(map.get(claimLineKey({ offScopeKind: OFF_SCOPE_KINDS.UNLISTED, productId: 9 })).quantity).toBe(3);
  });

  it("مرجوعیِ همین صفحه کنار می‌رود؛ قلمِ فروش با id؛ سندِ خالی", () => {
    const sale = { items: [{ id: 7, otherReturnClaims: [claim(1, 2), claim(4, 5)] }] };
    expect(claimsElsewhereOf(sale, 4).get("l-7").quantity).toBe(2);
    expect(claimsElsewhereOf(null).size).toBe(0);
  });
});
