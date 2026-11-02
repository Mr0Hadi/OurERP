import { describe, expect, it, vi } from "vitest";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { ProductUnitStatusEnum } from "@/shared/domain/enums/unitStatus";
import { EFFECT_DIRECTIONS, EFFECT_STATUSES } from "./effects";
import {
  MONEY_DIRECTIONS,
  activeMoneySlotOf,
  buildGoodsLines,
  claimRemainingQuantity,
  emptyComposition,
  moneyDirectionOf,
  resolveSources,
  sourceSplit,
  summarizeReturn,
  toApiComposition,
} from "./resolutions";

const { CASH, CHECK, MIXED } = PaymentTypeEnum;
const claim = { id: 1, productId: 10, productCode: "P10", productName: "لنت", unit: "عدد", unitPrice: 1500, quantity: 5 };

const composition = (patch = {}) => {
  const base = emptyComposition(patch.quantity ?? 2);
  return {
    ...base,
    ...patch,
    goodsIn: { ...base.goodsIn, ...patch.goodsIn },
    goodsOut: { ...base.goodsOut, ...patch.goodsOut },
    goodsRelease: { ...base.goodsRelease, ...patch.goodsRelease },
    goodsScrap: { ...base.goodsScrap, ...patch.goodsScrap },
    moneyIn: { ...base.moneyIn, ...patch.moneyIn },
    moneyOut: { ...base.moneyOut, ...patch.moneyOut },
  };
};

describe("منبعِ عودت/اسقاط", () => {
  it("قرنطینه‌ی آزادِ ادعا اول، باقی از قفسه؛ خارج از سفارش همه از قرنطینه", () => {
    expect(sourceSplit(5, { quarantineAvailable: 2, offScope: false })).toEqual({ fromQuarantine: 2, fromStock: 3 });
    expect(sourceSplit(5, { quarantineAvailable: 9, offScope: false })).toEqual({ fromQuarantine: 5, fromStock: 0 });
    expect(sourceSplit(5, { quarantineAvailable: null, offScope: false })).toEqual({ fromQuarantine: 0, fromStock: 5 });
    expect(sourceSplit(5, { quarantineAvailable: 0, offScope: true })).toEqual({ fromQuarantine: 5, fromStock: 0 });
  });

  it("toApiComposition عودت را به دو ردیف با source می‌شکند", () => {
    const resolved = resolveSources(composition({ quantity: 5, goodsOut: { enabled: true } }), { quarantineAvailable: 2, offScope: false });
    expect(toApiComposition(resolved, claim).goodsOut).toEqual([
      { quantity: 2, productId: 10, unitPrice: 1500, source: ProductUnitStatusEnum.QUARANTINED },
      { quantity: 3, productId: 10, unitPrice: 1500, source: ProductUnitStatusEnum.IN_STOCK },
    ]);
  });
});

describe("جهتِ پول", () => {
  it("از روی اسلاتِ فعال", () => {
    expect(moneyDirectionOf(composition())).toBe(MONEY_DIRECTIONS.NONE);
    expect(moneyDirectionOf(composition({ moneyIn: { enabled: true } }))).toBe(MONEY_DIRECTIONS.RECEIVE);
    expect(activeMoneySlotOf(composition({ moneyOut: { enabled: true } }))).toBe("moneyOut");
  });
});

describe("toApiComposition", () => {
  it("بخشش هیچ اثری ندارد", () => {
    expect(toApiComposition(composition({ quantity: 2, writeOff: true, note: "x" }), claim)).toEqual({ quantity: 2, note: "x", writeOff: true });
  });

  it("کالای پیش‌فرض همان کالای ادعا؛ پولِ ترکیبی مجموعِ تکه‌های مثبت", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 28, 12, 0, 0));
    const body = toApiComposition(composition({
      quantity: 2,
      goodsIn: { enabled: true },
      moneyOut: { enabled: true, method: MIXED, parts: [{ method: CASH, amount: "1000" }, { method: CHECK, amount: 0 }, { method: CHECK, amount: 500, checkNumber: "9" }] },
    }), claim);
    vi.useRealTimers();
    expect(body.goodsIn).toEqual([{ quantity: 2, productId: 10, unitPrice: 1500, source: undefined }]);
    expect(body.moneyOut).toEqual({
      method: MIXED, amount: 1500, reference: undefined, paidAt: "2026-10-28T12:00:00",
      parts: [
        { method: CASH, amount: 1000, checkNumber: undefined, transferRef: undefined },
        { method: CHECK, amount: 500, checkNumber: "9", transferRef: undefined },
      ],
    });
    expect(body.goodsOut).toBeUndefined();
    expect(body.moneyIn).toBeUndefined();
  });

  it("پولِ وعده‌ای (paidNow خاموش) تاریخ ندارد؛ مبلغِ صفر فرستاده نمی‌شود", () => {
    const body = toApiComposition(composition({ moneyIn: { enabled: true, amount: "800", paidNow: false } }), claim);
    expect(body.moneyIn).toMatchObject({ amount: 800, paidAt: undefined });
    expect(toApiComposition(composition({ moneyIn: { enabled: true, amount: "" } }), claim).moneyIn).toBeUndefined();
  });
});

describe("روی خودِ مرجوعی", () => {
  const effect = (direction, status, extra = {}) => ({ id: `${direction}-${status}`, direction, status, quantity: 2, appliedQuantity: 0, ...extra });
  const doc = {
    claims: [
      {
        ...claim,
        resolutions: [
          { id: 1, quantity: 2, effects: [effect(EFFECT_DIRECTIONS.GOODS_IN, EFFECT_STATUSES.PENDING, { productId: 10 }), effect(EFFECT_DIRECTIONS.MONEY_OUT, EFFECT_STATUSES.APPLIED, { amount: 3000 })] },
          { id: 2, quantity: 1, effects: [effect(EFFECT_DIRECTIONS.GOODS_SCRAP, EFFECT_STATUSES.APPLIED, { productId: 10 })] },
        ],
      },
    ],
  };

  it("باقیمانده‌ی ادعا", () => {
    expect(claimRemainingQuantity(doc.claims[0])).toBe(2);
    expect(claimRemainingQuantity({ quantity: 1, resolutions: [{ quantity: 3 }] })).toBe(0);
  });

  it("ردیف‌های انبار فقط اثرهای معلقِ همان جهت، با کد و واحدِ ادعا", () => {
    const lines = buildGoodsLines(doc, EFFECT_DIRECTIONS.GOODS_IN);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ productCode: "P10", unit: "عدد", remainingQuantity: 2, claimId: 1, resolutionId: 1 });
    expect(buildGoodsLines(doc, [EFFECT_DIRECTIONS.GOODS_SCRAP], { onlyPending: false })).toHaveLength(1);
  });

  it("جمع از دیدِ شرکت: فقط اعمال‌شده‌ها مگر includePending", () => {
    expect(summarizeReturn(doc)).toMatchObject({ moneyOut: 3000, netMoney: -3000, goodsInQuantity: 0, pendingCount: 1 });
    expect(summarizeReturn(doc, { includePending: true })).toMatchObject({ goodsInQuantity: 2 });
  });
});
