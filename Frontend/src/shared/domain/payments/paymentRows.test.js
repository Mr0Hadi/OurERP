import { describe, expect, it, vi } from "vitest";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { ChequeStatusEnum } from "@/shared/domain/enums/chequeStatus";
import {
  isChequeSettled,
  paymentTypeOf,
  takesBankAccount,
  toApiChequeFields,
  toApiPaymentRows,
  toPaymentPayload,
} from "./paymentRows";

const { CASH, CREDIT, CHECK, TRANSFER, MIXED } = PaymentTypeEnum;

describe("toPaymentPayload", () => {
  it("مرجع و صندوق فقط برای روشِ خودشان", () => {
    const base = { amount: "1000", checkNumber: "C1", transferRef: "T1", bankAccountId: 7, direction: 1 };
    expect(toPaymentPayload({ ...base, type: CASH })).toMatchObject({
      type: CASH, amount: 1000, checkNumber: undefined, transferRef: undefined, bankAccountId: 7, direction: 1,
    });
    expect(toPaymentPayload({ ...base, type: TRANSFER })).toMatchObject({ transferRef: "T1", checkNumber: undefined, bankAccountId: 7 });
    expect(toPaymentPayload({ ...base, type: CHECK })).toMatchObject({ checkNumber: "C1", transferRef: undefined, bankAccountId: undefined });
  });

  it("بی جهت وقتی سرور خودش می‌گذارد", () => {
    expect(toPaymentPayload({ type: CASH, amount: 1, direction: 2 }, { withDirection: false })).not.toHaveProperty("direction");
  });
});

describe("toApiChequeFields", () => {
  it("فقط برای چک، با trim و بی مقدارِ خالی", () => {
    expect(toApiChequeFields({ type: CASH, checkBankName: "ملت" })).toEqual({});
    expect(toApiChequeFields({ type: CHECK, checkDueDate: "", checkBankName: "  ملت ", checkDrawerName: " " })).toEqual({
      checkDueDate: undefined, checkBankName: "ملت", checkDrawerName: undefined,
    });
  });
});

describe("toApiPaymentRows", () => {
  it("ردیفِ بی‌مبلغ حذف، تاریخِ خالی = همین حالا", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 28, 9, 5, 0));
    const rows = toApiPaymentRows([
      { type: CASH, amount: 0 },
      { type: CASH, amount: 500 },
      { type: CHECK, amount: 300, paidAt: "2026-10-01" },
    ]);
    vi.useRealTimers();
    expect(rows.map((r) => [r.type, r.amount, r.paidAt])).toEqual([
      [CASH, 500, "2026-10-28T09:05:00"],
      [CHECK, 300, "2026-10-01"],
    ]);
  });
});

describe("paymentTypeOf", () => {
  it("بی ردیف نسیه، یک روش همان، چند روش ترکیبی؛ ابطال‌شده‌ها حساب نمی‌شوند", () => {
    expect(paymentTypeOf([])).toBe(CREDIT);
    expect(paymentTypeOf([{ type: CHECK }, { type: CHECK }])).toBe(CHECK);
    expect(paymentTypeOf([{ type: CASH }, { type: CHECK }])).toBe(MIXED);
    expect(paymentTypeOf([{ type: CASH }, { type: CHECK, voidedAt: "2026-01-01" }])).toBe(CASH);
    expect(paymentTypeOf([{ type: CASH }, { type: CHECK, pending: "void" }])).toBe(CASH);
  });
});

describe("قواعدِ کوچک", () => {
  it("takesBankAccount فقط نقدی و انتقال", () => {
    expect([CASH, TRANSFER, CHECK, CREDIT].map(takesBankAccount)).toEqual([true, true, false, false]);
  });
  it("چکِ تعیین‌تکلیف‌شده قفل است", () => {
    expect(isChequeSettled({ checkStatus: ChequeStatusEnum.PENDING })).toBe(false);
    expect(isChequeSettled({ checkStatus: ChequeStatusEnum.PENDING + 1 })).toBe(true);
    expect(isChequeSettled({})).toBe(false);
  });
});
