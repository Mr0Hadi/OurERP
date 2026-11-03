import { describe, expect, it, vi } from "vitest";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { SaleInstallmentStatusEnum } from "@/shared/domain/enums/saleInstallment";
import {
  EMPTY_PLAN_DRAFT,
  addMonthsIso,
  grossPenaltyOf,
  installmentPayableToday,
  overdueOf,
  penaltyWaiveErrors,
  settlementQuoteOf,
  planDraftErrors,
  planPreviewRequestOf,
  toApiCreatePlan,
  toApiInstallmentPayment,
} from "./installmentPlan";

const draft = (patch) => ({ ...EMPTY_PLAN_DRAFT, ...patch });

describe("addMonthsIso — مثلِ DateTime.AddMonths", () => {
  it("روزِ ناموجود به آخرِ ماه می‌چسبد", () => {
    expect(addMonthsIso("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsIso("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonthsIso("2026-11-30", 3)).toBe("2027-02-28");
    expect(addMonthsIso("2026-05-15", 0)).toBe("2026-05-15");
    expect(addMonthsIso("", 1)).toBe("");
  });
});

describe("planPreviewRequestOf — بدنه‌ی پیش‌نمایشِ سرور", () => {
  it("شرایطِ کامل ⇒ بدنه؛ ناقص ⇒ null", () => {
    const full = draft({ markupPercentage: "10", installmentCount: "3", downPaymentAmount: 100, firstDueDate: "2026-01-31" });
    expect(planPreviewRequestOf(7, full)).toEqual({
      saleId: 7, markupPercentage: 10, downPaymentAmount: 100, installmentCount: 3, firstDueDate: "2026-01-31", latePenaltyPercentage: null,
    });
    expect(planPreviewRequestOf(null, full)).toBe(null);
    expect(planPreviewRequestOf(7, { ...full, firstDueDate: "" })).toBe(null);
    expect(planPreviewRequestOf(7, { ...full, installmentCount: "1.5" })).toBe(null);
    expect(planPreviewRequestOf(7, { ...full, markupPercentage: "1.12345" })).toBe(null);
  });
});

describe("planDraftErrors", () => {
  it("فیلدهای اجباری و دقتِ درصد", () => {
    expect(Object.keys(planDraftErrors(draft({})))).toEqual(["markupPercentage", "installmentCount", "firstDueDate"]);
    expect(planDraftErrors(draft({ markupPercentage: "-1", installmentCount: "2", firstDueDate: "2026-01-01" }))).toHaveProperty("markupPercentage");
    expect(planDraftErrors(draft({ markupPercentage: "0", installmentCount: "2", firstDueDate: "2026-01-01", latePenaltyPercentage: "x" }))).toHaveProperty("latePenaltyPercentage");
  });

  it("صدورِ فاکتور: پیش‌پرداختِ مثبت و کمتر از قابلِ پرداخت، سررسید نه پیش از پیش‌پرداخت", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 28));
    const base = { markupPercentage: "5", installmentCount: "6", firstDueDate: "2026-11-01" };
    expect(planDraftErrors(draft({ ...base, downPaymentAmount: 0 }), { withDownPayment: true, payable: 1000 }).downPaymentAmount)
      .toContain("بیشتر از صفر");
    expect(planDraftErrors(draft({ ...base, downPaymentAmount: 1000 }), { withDownPayment: true, payable: 1000 }).downPaymentAmount)
      .toContain("کمتر");
    expect(planDraftErrors(draft({ ...base, downPaymentAmount: 100, firstDueDate: "2026-10-01" }), { withDownPayment: true, payable: 1000 }))
      .toHaveProperty("firstDueDate");
    expect(planDraftErrors(draft({ ...base, downPaymentAmount: 100 }), { withDownPayment: true, payable: 1000 })).toEqual({});
    vi.useRealTimers();
  });
});

describe("بدنه‌ی API", () => {
  it("مرجع و صندوق فقط برای روشِ خودشان", () => {
    const payment = { paymentType: PaymentTypeEnum.CHECK, checkNumber: "77", transferRef: "T", bankAccountId: 3, paidAt: "" };
    expect(toApiInstallmentPayment(payment)).toMatchObject({ checkNumber: "77", transferRef: null, bankAccountId: null, paidAt: null });
    expect(toApiInstallmentPayment({ ...payment, paymentType: PaymentTypeEnum.TRANSFER })).toMatchObject({
      checkNumber: null, transferRef: "T", bankAccountId: 3,
    });
  });

  it("toApiCreatePlan: درصدِ جریمه‌ی خالی null است، نه صفر", () => {
    const body = toApiCreatePlan(draft({ markupPercentage: "2.5", installmentCount: "12", firstDueDate: "2026-12-01", downPaymentAmount: 500 }));
    expect(body).toMatchObject({ markupPercentage: 2.5, installmentCount: 12, downPaymentAmount: 500, latePenaltyPercentage: null });
  });
});

describe("قسط‌ها و جریمه", () => {
  const rows = [
    { amount: 100, status: SaleInstallmentStatusEnum.OVERDUE, penaltyDue: 7, penaltyWaivedAmount: 3 },
    { amount: 200, status: SaleInstallmentStatusEnum.PENDING },
    { amount: 300, status: SaleInstallmentStatusEnum.OVERDUE },
  ];
  it("سررسیدگذشته‌ها، مبلغِ امروز و جریمه‌ی ناخالص", () => {
    expect(overdueOf(rows)).toEqual({ count: 2, amount: 400 });
    expect(installmentPayableToday(rows[0])).toBe(107);
    expect(grossPenaltyOf(rows[0])).toBe(10);
  });

  it("بخشودگی: مبلغِ صحیحِ نامنفی، دلیل برای مبلغِ مثبت", () => {
    expect(penaltyWaiveErrors({ amount: null, reason: "" })).toHaveProperty("amount");
    expect(penaltyWaiveErrors({ amount: 1.5, reason: "x" })).toHaveProperty("amount");
    expect(penaltyWaiveErrors({ amount: 10, reason: "  " })).toHaveProperty("reason");
    expect(penaltyWaiveErrors({ amount: 10, reason: "x".repeat(501) })).toHaveProperty("reason");
    expect(penaltyWaiveErrors({ amount: 0, reason: "" })).toEqual({});
  });
});

describe("settlementQuoteOf", () => {
  it("عددِ امروزِ سرور با تخفیف و جریمه", () => {
    const plan = { remainingAmount: 1_000, penaltyDueAmount: 50, earlySettlementDiscountPreview: 120, settlementAmountToday: 930 };
    expect(settlementQuoteOf(plan)).toEqual({ remaining: 1_000, discount: 120, penalty: 50, total: 930, exact: true });
  });

  it("بی پیش‌نمایشِ سرور: مانده + جریمه، تقریبی", () => {
    expect(settlementQuoteOf({ remainingAmount: 1_000, penaltyDueAmount: 50 })).toEqual({
      remaining: 1_000,
      discount: 0,
      penalty: 50,
      total: 1_050,
      exact: false,
    });
  });
});
