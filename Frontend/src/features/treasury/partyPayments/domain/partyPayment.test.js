import { describe, expect, it } from "vitest";
import { PaymentDirectionEnum } from "@/shared/domain/enums/paymentDirection";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import {
  PARTY_KIND,
  allocationErrors,
  autoAllocate,
  emptyPartyPaymentDraft,
  hasAllocationErrors,
  naturalDirection,
  partyPaymentDraftErrors,
  toApiAllocations,
  toApiPartyPayment,
} from "./partyPayment";

const docs = [
  { saleId: 1, remainingAmount: 300 },
  { saleId: 2, remainingAmount: 500 },
  { purchaseId: 1, remainingAmount: 1000 },
];

describe("جهت و پیش‌نویس", () => {
  it("از مشتری دریافت، به تامین‌کننده پرداخت", () => {
    expect(naturalDirection(PARTY_KIND.CUSTOMER)).toBe(PaymentDirectionEnum.IN);
    expect(naturalDirection(PARTY_KIND.SUPPLIER)).toBe(PaymentDirectionEnum.OUT);
    expect(emptyPartyPaymentDraft({ supplierId: 9 })).toMatchObject({ partyKind: PARTY_KIND.SUPPLIER, partyId: 9, direction: PaymentDirectionEnum.OUT });
  });

  it("خطاها", () => {
    const errors = partyPaymentDraftErrors({ ...emptyPartyPaymentDraft({ supplierId: null }), description: "x".repeat(501) });
    expect(errors).toEqual({ partyId: "مشتری را انتخاب کنید", amount: "مبلغ باید از صفر بیشتر باشد", description: "شرح حداکثر ۵۰۰ نویسه است" });
  });

  it("بدنه‌ی API: طرف، مرجع و صندوق", () => {
    const body = toApiPartyPayment({
      ...emptyPartyPaymentDraft({ supplierId: 4 }), type: PaymentTypeEnum.CHECK, amount: 900, checkNumber: "55", transferRef: "X", bankAccountId: 2, description: "  ",
    });
    expect(body).toMatchObject({ customerId: null, supplierId: 4, checkNumber: "55", transferRef: null, bankAccountId: null, description: null, allocations: [] });
  });
});

describe("تخصیص", () => {
  it("خودکار: قدیمی‌ترین اول تا سقفِ موجودی", () => {
    expect(autoAllocate(docs, 600)).toEqual({ "sale-1": 300, "sale-2": 300 });
    expect(autoAllocate(docs, 0)).toEqual({});
  });

  it("خطای ردیف و جمع", () => {
    const errors = allocationErrors(docs, { "sale-1": 400, "sale-2": 100 }, 450);
    expect(errors).toEqual({ rows: { "sale-1": "بیشتر از مانده‌ی فاکتور" }, total: "جمعِ تخصیص از مبلغِ قابلِ تخصیص بیشتر است" });
    expect(hasAllocationErrors(errors)).toBe(true);
    expect(hasAllocationErrors(allocationErrors(docs, { "sale-1": 300 }, 300))).toBe(false);
  });

  it("فروش و خرید با شناسه‌ی یکسان قاطی نمی‌شوند؛ صفر فرستاده نمی‌شود", () => {
    expect(toApiAllocations(docs, { "sale-1": 0, "purchase-1": 250 })).toEqual([{ saleId: null, purchaseId: 1, amount: 250 }]);
  });
});
