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
  planDraftErrors,
  previewInstallmentPlan,
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

describe("previewInstallmentPlan — قاعده‌ی InstallmentScheduleِ سرور", () => {
  it("سود، مانده، قسط‌ها و باقیمانده روی قسطِ آخر", () => {
    const plan = previewInstallmentPlan(1_000_000, draft({
      markupPercentage: "10", installmentCount: "3", downPaymentAmount: 100_000, firstDueDate: "2026-01-31",
    }));
    expect(plan).toMatchObject({
      cashAmount: 1_000_000, installmentChargeAmount: 100_000, totalAmount: 1_100_000,
      financedAmount: 1_000_000, installmentAmount: 333_333,
    });
    expect(plan.installments.map((i) => [i.dueDate, i.amount])).toEqual([
      ["2026-01-31", 333_333], ["2026-02-28", 333_333], ["2026-03-31", 333_334],
    ]);
    expect(plan.installments.reduce((sum, i) => sum + i.amount, 0)).toBe(plan.financedAmount);
  });

  it("سود بی خطای ممیزِ شناور: ۳۰۰۰ × ۱٫۱۵٪ = ۳۴٫۵ → ۳۵ (Math.round روی Number ۳۴ می‌داد)", () => {
    expect(Math.round((3000 * 1.15) / 100)).toBe(34); // همان خطایی که BigInt جلویش را گرفته
    expect(previewInstallmentPlan(3000, draft({ markupPercentage: "1.15", installmentCount: "1" })).installmentChargeAmount).toBe(35);
  });

  it("بی سررسید قسط‌ها خالی‌اند؛ ورودیِ ناقص null", () => {
    expect(previewInstallmentPlan(1000, draft({ markupPercentage: "0", installmentCount: "2" })).installments).toEqual([]);
    expect(previewInstallmentPlan(0, draft({ markupPercentage: "0", installmentCount: "2" }))).toBe(null);
    expect(previewInstallmentPlan(1000, draft({ markupPercentage: "1.12345", installmentCount: "2" }))).toBe(null);
    expect(previewInstallmentPlan(1000, draft({ markupPercentage: "5", installmentCount: "1.5" }))).toBe(null);
  });

  it("پیش‌پرداختِ بیش از جمع مانده را منفی نمی‌کند", () => {
    expect(previewInstallmentPlan(1000, draft({ markupPercentage: "0", installmentCount: "2", downPaymentAmount: 5000 })).financedAmount).toBe(0);
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
