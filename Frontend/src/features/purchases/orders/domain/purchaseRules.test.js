import { describe, expect, it } from "vitest";
import { PurchaseStatusEnum } from "@/shared/domain/enums/purchaseStatus";
import { PURCHASE_PAYMENT_SIDE } from "./purchasePayments";
import { missingInvoiceFields, purchaseFormProblem, stillOwedOf } from "./purchaseRules";

const { PROFORMA, PENDING } = PurchaseStatusEnum;

describe("قلم‌ها پس از ثبت", () => {
  it("StillOwed = سفارش − رسیده − بسته‌شده، نه منفی", () => {
    expect(stillOwedOf({ quantity: 10, receivedQuantity: 4, shortClosedQuantity: 1 })).toBe(5);
    expect(stillOwedOf({ quantity: 3, receivedQuantity: 5 })).toBe(0);
  });
});

describe("فرمِ خرید", () => {
  it("فاکتورِ صادرشده شماره و تاریخ می‌خواهد؛ پیش‌فاکتور نه", () => {
    expect(missingInvoiceFields({}, PROFORMA)).toBe(null);
    expect(Object.keys(missingInvoiceFields({ invoiceNumber: "  " }, PENDING))).toEqual(["invoiceNumber", "invoiceDate"]);
    expect(missingInvoiceFields({ invoiceNumber: "F1", invoiceDate: "2026-10-01" }, "1")).toBe(null);
  });

  it("ترتیبِ خطاها", () => {
    expect(purchaseFormProblem({ formData: {}, items: [] })[1]).toBe("party");
    expect(purchaseFormProblem({ formData: { supplierId: 1 }, items: [] })[1]).toBe("items");
    expect(purchaseFormProblem({ formData: { supplierId: 1 }, items: [{}], invoiceErrors: { a: 1 } })[1]).toBe("info");
    expect(purchaseFormProblem({ formData: { supplierId: 1 }, items: [{}], invoiceErrors: null })).toBe(null);
    expect(PURCHASE_PAYMENT_SIDE.direction).toBe(2);
  });
});
