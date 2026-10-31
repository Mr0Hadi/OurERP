import { afterEach, describe, expect, it, vi } from "vitest";
import { carryOverLineClaims, clampClaimsToCaps } from "./carryOverClaims";
import { fromApiPurchaseReturn, fromApiSaleReturn, toApiClaim } from "./claimsApi";
import { verifyReturnEnums } from "./apiEnums";
import {
  EFFECT_DIRECTIONS as D,
  EFFECT_STATUSES as S,
  createEffect,
  isGoodsEffect,
  isPendingMoneyEffect,
  isTradedGoodsEffect,
  observationsOf,
  summarizeEffects,
} from "./effects";
import {
  OBSERVED_PROBLEMS,
  PURCHASE_CLAIM_PROBLEMS,
  PURCHASE_OFF_ORDER_CLAIM_PROBLEMS,
  PURCHASE_ON_ORDER_CLAIM_PROBLEMS,
  RETURN_PROBLEMS as P,
  SALES_CLAIM_PROBLEMS,
  problemLabels,
  problemSubset,
} from "./problems";
import { RETURN_SIDES, SIDE_CONFIG, sideConfig } from "./sides";
import { RETURN_STATUSES, isTerminalStatus } from "./statuses";
import { MONEY_DIRECTIONS } from "./resolutions";

afterEach(() => vi.restoreAllMocks());

describe("ادعاها روی سقفِ تازه", () => {
  it("به ترتیبِ فهرست بریده می‌شوند؛ مثبتِ بی‌جا حذف، صفرِ نیمه‌کاره می‌ماند", () => {
    const claims = [
      { id: "a", line: 1, quantity: 3 },
      { id: "b", line: 1, quantity: 2 },
      { id: "c", line: 1, quantity: "4" },
      { id: "d", line: 1, quantity: 0 },
      { id: "e", line: 2, quantity: 1 },
    ];
    expect(clampClaimsToCaps(claims, (claim) => claim.line, (line) => ({ 1: 4, 2: "5" })[line])).toEqual([
      { id: "a", line: 1, quantity: 3 },
      { id: "b", line: 1, quantity: 1 },
      { id: "d", line: 1, quantity: 0 },
      { id: "e", line: 2, quantity: 1 },
    ]);
  });

  it("خطوطِ تازه ادعاهای قبلی را با `orderLineId` می‌گیرند", () => {
    const previous = [{ orderLineId: 7, claims: [{ quantity: 5 }] }, { orderLineId: 8, claims: [{ quantity: 1 }] }];
    const next = [{ orderLineId: 7, maxReturnableQuantity: 2 }, { orderLineId: 9, maxReturnableQuantity: 3 }];
    expect(carryOverLineClaims(previous, next)).toEqual([
      { orderLineId: 7, maxReturnableQuantity: 2, claims: [{ quantity: 2 }] },
      { orderLineId: 9, maxReturnableQuantity: 3, claims: [] },
    ]);
  });
});

describe("مرزِ سرور", () => {
  it("ادعا → DTO با عددِ صریح و بی فیلدِ نمایشی", () => {
    expect(toApiClaim({ scope: 0, problem: P.DEFECTIVE, unitPrice: "1,000", quantity: "2", productName: "x", unit: "عدد" })).toEqual({
      orderLineId: null, scope: 0, offScopeKind: null, productId: null, unitPrice: 0, quantity: 2, problem: P.DEFECTIVE, note: "",
    });
    expect(toApiClaim({ orderLineId: 3, unitPrice: "1500", quantity: 1 }).unitPrice).toBe(1500);
  });

  it("خواندن: `purchaseItemId`/`saleItemId` → `orderLineId`، مقدارِ موجود مقدم", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(fromApiPurchaseReturn({ claims: [{ purchaseItemId: 4 }, { orderLineId: 1, purchaseItemId: 9 }] }).claims.map((c) => c.orderLineId)).toEqual([4, 1]);
    expect(fromApiSaleReturn({ claims: [{ saleItemId: 6 }, {}] }).claims.map((c) => c.orderLineId)).toEqual([6, null]);
    expect(fromApiSaleReturn({}).claims).toEqual([]);
    expect(fromApiSaleReturn(null)).toBe(null);
  });

  it("enumِ ناشناخته یک‌بار گزارش می‌شود؛ رشته‌ای با راهنمای خودش", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const doc = {
      status: "Open",
      claims: [{ scope: 0, offScopeKind: null, problem: 999, resolutions: [{ effects: [{ direction: 0, status: 0, method: null, history: [{ observations: [{ problem: 777 }] }] }] }] }],
    };
    verifyReturnEnums(doc);
    verifyReturnEnums(doc);
    expect(error).toHaveBeenCalledTimes(3);
    expect(error.mock.calls[0][0]).toContain("رشته‌ای");
    expect(error.mock.calls.map(([message]) => message.match(/«(.+?)»/)[1])).toEqual(["status", "claims[].problem", "observations[].problem"]);
    error.mockClear();
    verifyReturnEnums({ status: RETURN_STATUSES.OPEN, claims: [] });
    expect(error).not.toHaveBeenCalled();
  });
});

describe("اثرها", () => {
  it("دسته‌بندیِ جهت‌ها", () => {
    expect(Object.values(D).filter(isGoodsEffect)).toEqual([D.GOODS_IN, D.GOODS_OUT, D.GOODS_RELEASE, D.GOODS_SCRAP]);
    expect(Object.values(D).filter(isTradedGoodsEffect)).toEqual([D.GOODS_IN, D.GOODS_OUT]);
    expect(isPendingMoneyEffect({ direction: D.MONEY_IN, status: S.PENDING })).toBe(true);
    expect(isPendingMoneyEffect({ direction: D.GOODS_IN, status: S.PENDING })).toBe(false);
    expect(isPendingMoneyEffect(null)).toBe(false);
  });

  it("کالایی همیشه در انتظار، فیلدهای مالی خالی؛ مالیِ پرداخت‌شده اعمال‌شده", () => {
    const goods = createEffect({ direction: D.GOODS_IN, quantity: "3", productId: 5, unitPrice: 100, amount: 999, method: 1, paidAt: "x" });
    expect(goods).toMatchObject({ status: S.PENDING, quantity: 3, restockedQuantity: 0, amount: 0, method: null, unitPrice: 100, appliedAt: null });
    expect(createEffect({ direction: D.GOODS_SCRAP, unitPrice: 100 })).toMatchObject({ unitPrice: null, restockedQuantity: null });
    const paid = createEffect({ direction: D.MONEY_OUT, amount: "50", productId: 5, quantity: 9, paidAt: "2026-10-28" });
    expect(paid).toMatchObject({ status: S.APPLIED, amount: 50, quantity: 0, productId: null, appliedAt: "2026-10-28" });
    expect(createEffect({ direction: D.MONEY_IN, amount: 1 }).status).toBe(S.PENDING);
    expect(createEffect({ direction: D.MONEY_IN }).id).not.toBe(createEffect({ direction: D.MONEY_IN }).id);
  });

  it("مشاهده‌ها روی دورها تجمیع؛ مشکلِ صفر (عضوِ اول) هم شمرده می‌شود", () => {
    const effect = {
      history: [
        { observations: [{ problem: 0, quantity: 1, note: "خط" }, { problem: P.EXPIRED, quantity: "2" }] },
        { observations: [{ problem: 0, quantity: 2, note: "شکسته" }, { problem: null, quantity: 5 }, { problem: P.OTHER, quantity: 0 }] },
      ],
    };
    expect(observationsOf(effect)).toEqual([
      { problem: 0, quantity: 3, note: "خط / شکسته" },
      { problem: P.EXPIRED, quantity: 2, note: "" },
    ]);
    expect(observationsOf(undefined)).toEqual([]);
  });

  it("جمع از دیدِ شرکت: واقعیت یا پیش‌نمایش", () => {
    const effects = [
      { direction: D.GOODS_IN, status: S.APPLIED, quantity: 5, appliedQuantity: 3 },
      { direction: D.GOODS_OUT, status: S.PENDING, quantity: 2, appliedQuantity: 0 },
      { direction: D.MONEY_IN, status: S.APPLIED, amount: 100 },
      { direction: D.MONEY_OUT, status: S.PENDING, amount: 300 },
      { direction: D.MONEY_OUT, status: S.VOID, amount: 999 },
      { direction: D.GOODS_SCRAP, status: S.APPLIED, quantity: 9, appliedQuantity: 9 },
    ];
    expect(summarizeEffects(effects)).toEqual({ goodsInQuantity: 3, goodsOutQuantity: 0, moneyIn: 100, moneyOut: 0, netMoney: 100, pendingCount: 2 });
    expect(summarizeEffects(effects, { includePending: true })).toEqual({ goodsInQuantity: 5, goodsOutQuantity: 2, moneyIn: 100, moneyOut: 300, netMoney: -200, pendingCount: 2 });
    expect(summarizeEffects()).toMatchObject({ netMoney: 0, pendingCount: 0 });
  });
});

describe("مشکل‌ها، سمت‌ها و وضعیت‌ها", () => {
  it("زیرمجموعه‌ها بی تکرار؛ «کسری» در مشاهده و ادعای روی سفارش نیست", () => {
    for (const list of [SALES_CLAIM_PROBLEMS, PURCHASE_CLAIM_PROBLEMS, PURCHASE_ON_ORDER_CLAIM_PROBLEMS, PURCHASE_OFF_ORDER_CLAIM_PROBLEMS, OBSERVED_PROBLEMS]) {
      expect(new Set(list).size).toBe(list.length);
    }
    for (const list of [OBSERVED_PROBLEMS, PURCHASE_ON_ORDER_CLAIM_PROBLEMS]) {
      expect(list).not.toContain(P.SHORT_SHIPPED);
      expect(list).not.toContain(P.OVER_SHIPPED);
    }
    expect(PURCHASE_CLAIM_PROBLEMS).toEqual(expect.arrayContaining([...PURCHASE_ON_ORDER_CLAIM_PROBLEMS, ...PURCHASE_OFF_ORDER_CLAIM_PROBLEMS]));
  });

  it("problemSubset/problemLabels", () => {
    expect(problemSubset([P.EXPIRED, P.OTHER])).toEqual({ EXPIRED: P.EXPIRED, OTHER: P.OTHER });
    const labels = problemLabels([P.DEFECTIVE, P.OTHER], { [P.OTHER]: "دیگر" });
    expect(labels[P.OTHER]).toBe("دیگر");
    expect(labels[P.DEFECTIVE]).toBeTruthy();
  });

  it("هر سمت همه‌ی جهت‌ها، وضعیت‌ها و جهت‌های پول را برچسب دارد", () => {
    for (const side of Object.values(RETURN_SIDES)) {
      const config = SIDE_CONFIG[side];
      expect(Object.keys(config.effectLabels).map(Number).sort()).toEqual(Object.values(D).sort());
      expect(Object.keys(config.statusLabels).map(Number).sort()).toEqual(Object.values(RETURN_STATUSES).sort());
      expect(Object.keys(config.money).sort()).toEqual(Object.values(MONEY_DIRECTIONS).map(String).sort());
      expect(config.goodsSlots.map((slot) => slot.slot).sort()).toEqual(["goodsIn", "goodsOut"]);
      expect(sideConfig(side)).toBe(config);
    }
    expect(SIDE_CONFIG[RETURN_SIDES.SALES].priceOf({ retailPrice: 5, purchasePrice: 3 })).toBe(5);
    expect(SIDE_CONFIG[RETURN_SIDES.PURCHASE].priceOf({})).toBe(0);
  });

  it("وضعیتِ پایانی", () => {
    // «تسویه‌شده» عمداً در فهرستِ پایانی نیست (`TERMINAL_RETURN_STATUSES`).
    expect(Object.values(RETURN_STATUSES).filter(isTerminalStatus)).toEqual([RETURN_STATUSES.REJECTED, RETURN_STATUSES.CANCELLED]);
    expect(sideConfig(99)).toBe(SIDE_CONFIG[RETURN_SIDES.SALES]);
  });
});
