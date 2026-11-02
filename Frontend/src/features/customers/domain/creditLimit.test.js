import { describe, expect, it } from "vitest";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { creditCheck, creditRefusalOf, settledNowOf, settlesNow } from "./creditLimit";

const { CASH, CHECK, TRANSFER } = PaymentTypeEnum;

describe("سقفِ اعتبار — هشدارِ پیش از ثبت", () => {
  it("نقد و انتقال تسویه‌اند؛ چک، ابطال‌شده و جهتِ مخالف نه", () => {
    const rows = [
      { type: CASH, amount: 100, direction: 1 },
      { type: TRANSFER, amount: 50, direction: 1, pending: "add" },
      { type: CHECK, amount: 900, direction: 1 },
      { type: CASH, amount: 30, direction: 1, pending: "void" },
      { type: CASH, amount: 20, direction: 2 },
    ];
    expect(settledNowOf(rows, 1)).toBe(130);
    expect([settlesNow(CASH), settlesNow(CHECK)]).toEqual([true, false]);
  });

  it("بی‌سقف یا کاملاً نقد: هشدار نیست؛ بیش از اعتبارِ مانده: مازاد و حداقلِ نقد", () => {
    expect(creditCheck({ customer: { creditLimit: null }, payable: 1000 })).toBe(null);
    expect(creditCheck({ customer: { creditLimit: 0 }, payable: 1000, settledNow: 1000 })).toBe(null);
    expect(creditCheck({ customer: { creditLimit: 5000, creditAvailable: 2000 }, payable: 1500 })).toBe(null);
    expect(creditCheck({ customer: { creditLimit: 5000, creditAvailable: 2000 }, payable: 3000, settledNow: 500 })).toEqual({
      cashOnly: false,
      credit: 2500,
      available: 2000,
      excess: 500,
      minCash: 500,
    });
  });

  it("فقط نقدی و مشتریِ بالای سقف: حداقلِ نقد از کلِ نسیه بیشتر نیست", () => {
    expect(creditCheck({ customer: { creditLimit: 0, creditAvailable: 0 }, payable: 800 })).toMatchObject({ cashOnly: true, minCash: 800 });
    expect(creditCheck({ customer: { creditLimit: 1000, creditAvailable: -300 }, payable: 200 })).toMatchObject({ excess: 500, minCash: 200 });
  });
});

describe("پاسخِ ردِ سرور", () => {
  it("بدنه‌ی PascalCase؛ خطای دیگر null", () => {
    const error = {
      response: {
        data: {
          Message: "این فروش از سقف اعتبار بیشتر است.",
          Data: { CreditLimitExceeded: true, CustomerId: 7, CustomerName: "علی", CreditLimit: 5000, CurrentExposure: 0, UnclearedCheques: 0, AddedAmount: 8000, Exposure: 8000, Excess: 3000 },
        },
      },
    };
    expect(creditRefusalOf(error)).toMatchObject({ customerId: 7, creditLimit: 5000, addedAmount: 8000, excess: 3000 });
    expect(creditRefusalOf({ response: { data: { Message: "x", Data: null } } })).toBe(null);
    expect(creditRefusalOf(new Error("network"))).toBe(null);
  });
});
