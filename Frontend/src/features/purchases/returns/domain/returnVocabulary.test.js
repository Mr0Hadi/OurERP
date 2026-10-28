import { describe, expect, it } from "vitest";
import { OFF_SCOPE_KINDS } from "@/shared/domain/returns/scopes";
import { RETURN_PROBLEMS as P } from "@/shared/domain/returns/problems";
import {
  SALES_OFF_ORDER_PROBLEM_LABELS,
  SALES_ON_ORDER_PROBLEM_LABELS,
  SALES_RETURN_PROBLEM_LABELS,
  OFF_SCOPE_KIND_LABELS as SALES_OFF_SCOPE,
} from "@/features/sales/returns/domain/salesReturnVocabulary";
import {
  OFF_SCOPE_KIND_LABELS,
  PURCHASE_OFF_ORDER_PROBLEM_LABELS,
  PURCHASE_ON_ORDER_PROBLEM_LABELS,
  PURCHASE_RETURN_PROBLEM_LABELS,
  PURCHASE_RETURN_PROBLEM_STYLES,
  claimableQuantityOf,
  freeExcessQuantityOf,
  freeUnlistedQuantityOf,
  hasAnythingArrived,
} from "./purchaseReturnVocabulary";

const keys = (map) => Object.keys(map).map(Number);

describe("واژگانِ مرجوعی", () => {
  it("فروش: «بیشتر از فاکتور» و «خارج از فاکتور» فقط بیرون از فاکتور؛ «کمتر از فاکتور» روی فاکتور", () => {
    expect(keys(SALES_ON_ORDER_PROBLEM_LABELS)).not.toContain(P.OVER_SHIPPED);
    expect(keys(SALES_ON_ORDER_PROBLEM_LABELS)).not.toContain(P.UNLISTED_ITEM);
    expect(keys(SALES_ON_ORDER_PROBLEM_LABELS)).toContain(P.SHORT_SHIPPED);
    expect(keys(SALES_OFF_ORDER_PROBLEM_LABELS)).toEqual(expect.arrayContaining([P.OVER_SHIPPED, P.UNLISTED_ITEM, P.DEFECTIVE]));
    expect(keys(SALES_OFF_ORDER_PROBLEM_LABELS)).not.toContain(P.CHANGED_MIND);
    // هر گزینه در یکی از دو فهرست است.
    expect(new Set([...keys(SALES_ON_ORDER_PROBLEM_LABELS), ...keys(SALES_OFF_ORDER_PROBLEM_LABELS)])).toEqual(new Set(keys(SALES_RETURN_PROBLEM_LABELS)));
  });

  it("خرید: برچسب و استایل برای هر مشکل؛ زیرفهرست‌ها درونِ فهرستِ کل", () => {
    expect(keys(PURCHASE_RETURN_PROBLEM_STYLES).sort()).toEqual(keys(PURCHASE_RETURN_PROBLEM_LABELS).sort());
    for (const map of [PURCHASE_ON_ORDER_PROBLEM_LABELS, PURCHASE_OFF_ORDER_PROBLEM_LABELS]) {
      expect(keys(PURCHASE_RETURN_PROBLEM_LABELS)).toEqual(expect.arrayContaining(keys(map)));
      expect(Object.values(map).every(Boolean)).toBe(true);
    }
    for (const labels of [OFF_SCOPE_KIND_LABELS, SALES_OFF_SCOPE]) expect(keys(labels).sort()).toEqual(Object.values(OFF_SCOPE_KINDS).sort());
  });

  it("رسیده و سقف‌ها", () => {
    expect(hasAnythingArrived({ items: [{ receivedQuantity: 0 }, { receivedQuantity: 1 }] })).toBe(true);
    expect(hasAnythingArrived({ items: [{}] })).toBe(false);
    expect(hasAnythingArrived({})).toBe(false);
    expect([claimableQuantityOf({ claimableQuantity: "3" }), freeExcessQuantityOf(null), freeUnlistedQuantityOf({ freeQuantity: 2 })]).toEqual([3, 0, 2]);
  });
});
