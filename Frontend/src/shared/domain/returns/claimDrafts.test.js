import { describe, expect, it } from "vitest";
import { CLAIM_SCOPES, OFF_SCOPE_KINDS } from "./scopes";
import {
  addLineClaim,
  addOffScopeClaim,
  claimsAmountOf,
  claimsPayloadOf,
  removeLineClaim,
  sumClaimQuantity,
  updateLineClaim,
  updateOffScopeClaim,
} from "./claimDrafts";

const line = (claims = []) => ({ lineKey: "L1", orderLineId: 7, productId: 10, productCode: "P", productName: "لنت", unit: "عدد", unitPrice: "1200", maxReturnableQuantity: 5, claims });

describe("ادعاهای روی قلم", () => {
  it("ادعای تازه همه‌ی جای خالی را می‌گیرد؛ قلمِ پر دست نمی‌خورد", () => {
    const [withOne] = addLineClaim([line([{ id: "a", quantity: 2 }])], "L1", 3);
    expect(withOne.claims.map((c) => c.quantity)).toEqual([2, 3]);
    const full = line([{ id: "a", quantity: 5 }]);
    expect(addLineClaim([full], "L1", 3)[0]).toBe(full);
  });

  it("مقدار تا سقفِ قلم منهای ادعاهای دیگر بریده می‌شود", () => {
    const lines = [line([{ id: "a", quantity: 2 }, { id: "b", quantity: 1 }])];
    expect(updateLineClaim(lines, "L1", "b", "quantity", "9")[0].claims[1].quantity).toBe(3);
    expect(updateLineClaim(lines, "L1", "b", "quantity", "-1")[0].claims[1].quantity).toBe(0);
    expect(updateLineClaim(lines, "L1", "b", "note", "x")[0].claims[1].note).toBe("x");
    expect(removeLineClaim(lines, "L1", "a")[0].claims.map((c) => c.id)).toEqual(["b"]);
    expect(sumClaimQuantity([{ quantity: "2" }, { quantity: "x" }])).toBe(2);
  });
});

describe("ادعاهای خارج از سند", () => {
  const target = { orderLineId: 7, productId: 10, productCode: "P", productName: "لنت", unit: "عدد", unitPrice: 1200 };

  it("همان گروه یکی اضافه می‌شود، گروهِ تازه ادعای تازه", () => {
    let claims = addOffScopeClaim([], target, OFF_SCOPE_KINDS.EXCESS, 1);
    claims = addOffScopeClaim(claims, target, OFF_SCOPE_KINDS.EXCESS, 1);
    expect(claims).toHaveLength(1);
    expect(claims[0]).toMatchObject({ quantity: 2, orderLineId: 7, offScopeKind: OFF_SCOPE_KINDS.EXCESS });
    claims = addOffScopeClaim(claims, target, OFF_SCOPE_KINDS.UNLISTED, 1);
    expect(claims[1]).toMatchObject({ orderLineId: null, offScopeKind: OFF_SCOPE_KINDS.UNLISTED });
  });

  it("قیمتِ مازاد قفل است، سفارش‌نداده نه؛ مقدار با capOf", () => {
    const claims = [
      { id: "e", offScopeKind: OFF_SCOPE_KINDS.EXCESS, unitPrice: 1200, quantity: 1 },
      { id: "u", offScopeKind: OFF_SCOPE_KINDS.UNLISTED, unitPrice: 0, quantity: 1 },
    ];
    expect(updateOffScopeClaim(claims, "e", "unitPrice", 99)[0].unitPrice).toBe(1200);
    expect(updateOffScopeClaim(claims, "u", "unitPrice", "500")[1].unitPrice).toBe(500);
    expect(updateOffScopeClaim(claims, "u", "quantity", 9, () => 4)[1].quantity).toBe(4);
  });
});

describe("خروجی", () => {
  it("ادعای صفر فرستاده نمی‌شود؛ قیمت عدد می‌شود", () => {
    const payload = claimsPayloadOf(
      [line([{ id: "a", quantity: 2, problem: 3 }, { id: "b", quantity: 0, problem: 3 }])],
      [{ offScopeKind: OFF_SCOPE_KINDS.UNLISTED, orderLineId: 7, productId: 11, unitPrice: "300", quantity: 1, problem: 4 }],
    );
    expect(payload.map((c) => [c.scope, c.orderLineId, c.unitPrice, c.quantity])).toEqual([
      [CLAIM_SCOPES.ON_ORDER, 7, 1200, 2],
      [CLAIM_SCOPES.OFF_ORDER, null, 300, 1],
    ]);
    expect(claimsAmountOf(payload)).toBe(2700);
  });
});
