import { describe, expect, it } from "vitest";
import { PurchaseStatusEnum } from "@/shared/domain/enums/purchaseStatus";
import { PURCHASE_PAYMENT_SIDE } from "./purchasePayments";
import {
  canCancelPurchase,
  canClosePurchaseItem,
  canReopenPurchaseItem,
  missingInvoiceFields,
  purchaseFormProblem,
  purchaseStatusTargets,
  stillOwedOf,
} from "./purchaseRules";

const { PROFORMA, PENDING, SHIPPED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED } = PurchaseStatusEnum;

describe("لغو و وضعیتِ دستی", () => {
  it("لغو فقط از وضعیت‌های دستی و پیش از هر دریافت", () => {
    expect(canCancelPurchase({ status: PENDING, items: [{ receivedQuantity: 0 }] })).toBe(true);
    expect(canCancelPurchase({ status: SHIPPED, items: [{ receivedQuantity: 1 }] })).toBe(false);
    expect(canCancelPurchase({ status: PARTIALLY_RECEIVED, items: [] })).toBe(false);
    expect(canCancelPurchase(null)).toBe(false);
  });

  it("مقصدها؛ خروج از پیش‌فاکتور شماره و تاریخِ ذخیره‌شده می‌خواهد", () => {
    expect(purchaseStatusTargets({ status: PROFORMA })).toEqual([]);
    expect(purchaseStatusTargets({ status: PROFORMA, invoiceNumber: "F1", invoiceDate: "2026-10-01" })).toEqual([PENDING, SHIPPED]);
    expect(purchaseStatusTargets({ status: PENDING })).toEqual([SHIPPED]);
    expect(purchaseStatusTargets({ status: SHIPPED })).toEqual([PENDING]);
    expect(purchaseStatusTargets({ status: RECEIVED })).toEqual([]);
  });
});

describe("قلم‌ها پس از ثبت", () => {
  it("StillOwed = سفارش − رسیده − بسته‌شده، نه منفی", () => {
    expect(stillOwedOf({ quantity: 10, receivedQuantity: 4, shortClosedQuantity: 1 })).toBe(5);
    expect(stillOwedOf({ quantity: 3, receivedQuantity: 5 })).toBe(0);
  });

  it("بستن: لغونشده، چیزی از کلِ خرید رسیده، قبلاً بسته نشده، هنوز بدهکار", () => {
    const item = { quantity: 5, receivedQuantity: 0 };
    const other = { quantity: 1, receivedQuantity: 1 };
    const purchase = { status: PARTIALLY_RECEIVED, items: [item, other] };
    expect(canClosePurchaseItem(purchase, item)).toBe(true);
    expect(canClosePurchaseItem({ ...purchase, items: [item] }, item)).toBe(false);
    expect(canClosePurchaseItem({ ...purchase, status: CANCELLED }, item)).toBe(false);
    expect(canClosePurchaseItem(purchase, { ...item, shortClosedQuantity: 1 })).toBe(false);
    expect(canClosePurchaseItem(purchase, other)).toBe(false);
  });

  it("بازگشایی فقط قلمِ بسته‌شده‌ی خریدِ لغونشده", () => {
    expect(canReopenPurchaseItem({ status: RECEIVED }, { shortClosedQuantity: 2 })).toBe(true);
    expect(canReopenPurchaseItem({ status: CANCELLED }, { shortClosedQuantity: 2 })).toBe(false);
    expect(canReopenPurchaseItem({ status: RECEIVED }, { shortClosedQuantity: 0 })).toBe(false);
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
