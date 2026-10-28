import { describe, expect, it } from "vitest";
import { BalanceTypeEnum } from "@/shared/domain/enums/balanceType";
import { fullNameOf, initialsOf } from "@/features/auth/domain/userDisplay";
import { difference, groupCounts, orderedByCatalogue, sameSet, toNumberSet } from "@/features/permissions/components/permissionSets";
import { openingBalanceOf, partyBalanceOf } from "./partyBalance";
import { partyDisplayName } from "./partyName";

describe("مانده‌ی طرف حساب", () => {
  it("مانده‌ی اولیه با علامت؛ قدرِ مطلق از سرور", () => {
    expect(openingBalanceOf({ balance: -500, balanceType: BalanceTypeEnum.DEBTOR })).toBe(500);
    expect(openingBalanceOf({ balance: "500", balanceType: BalanceTypeEnum.CREDITOR })).toBe(-500);
    expect(openingBalanceOf({ balance: 500, balanceType: BalanceTypeEnum.BALANCED })).toBe(0);
    expect(openingBalanceOf(null)).toBe(0);
  });

  it("مانده‌ی کل = اولیه + گردشِ دفتر (طرفِ قدیمیِ بی‌گردش «تسویه» دیده نمی‌شود)", () => {
    expect(partyBalanceOf({ balance: 1000, balanceType: BalanceTypeEnum.DEBTOR })).toBe(1000);
    expect(partyBalanceOf({ balance: 1000, balanceType: BalanceTypeEnum.CREDITOR, ledgerBalance: "1500" })).toBe(500);
    expect(partyBalanceOf({ ledgerBalance: null })).toBe(0);
  });

  it("نامِ نمایشی", () => {
    expect(partyDisplayName({ companyName: "پارس", firstName: "علی" })).toBe("پارس");
    expect(partyDisplayName({ firstName: "علی", lastName: null })).toBe("علی");
  });
});

describe("کاربرِ واردشده", () => {
  it("سرنام از دو کلمه، نه دو حرفِ یک کلمه", () => {
    expect(initialsOf({ firstName: " امیر", lastName: "رضایی" })).toBe("ار");
    expect(initialsOf({ firstName: "امیر" })).toBe("ا");
    expect(initialsOf({ username: "admin" })).toBe("ad");
    expect(initialsOf({})).toBe("؟");
    expect([fullNameOf({ firstName: "امیر", lastName: "رضایی" }), fullNameOf({ username: "admin" })]).toEqual(["امیر رضایی", "admin"]);
  });
});

describe("مجموعه‌ی دسترسی‌ها", () => {
  const groups = [
    { group: 1, groupTitle: "فروش", permissions: [{ permission: 10 }, { permission: 11 }] },
    { group: 2, groupTitle: "خرید", permissions: [{ permission: 20 }] },
  ];

  it("ترتیبِ کاتالوگ، برابری و تفاضل", () => {
    const set = toNumberSet([{ permission: 20 }, { permission: 10 }]);
    expect(orderedByCatalogue(groups, set)).toEqual([10, 20]);
    expect([sameSet(set, new Set([10, 20])), sameSet(set, new Set([10]))]).toEqual([true, false]);
    expect(difference(set, new Set([10]))).toEqual([20]);
    expect(toNumberSet(null).size).toBe(0);
  });

  it("شمارِ هر گروه، گروهِ خالی نه", () => {
    expect(groupCounts(groups, new Set([11]))).toEqual([{ group: 1, title: "فروش", total: 2, count: 1 }]);
  });
});
