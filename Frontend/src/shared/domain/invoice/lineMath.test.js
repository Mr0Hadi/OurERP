import { describe, expect, it } from "vitest";
import { TaxCategoryEnum } from "@/shared/domain/enums/taxCategory";
import { invoiceLineAmounts, invoiceTotals, savedInvoiceTotals } from "./lineMath";

describe("invoiceLineAmounts — قاعده‌ی InvoiceLineMathِ سرور", () => {
  it("تخفیف و مالیات، گرد برای هر قلم", () => {
    // ۳ × ۳۳۳ = ۹۹۹؛ تخفیف ۱۰٪ = ۹۹٫۹ → ۱۰۰؛ خالص ۸۹۹؛ مالیات ۱۰٪ = ۸۹٫۹ → ۹۰
    expect(invoiceLineAmounts({ quantity: 3, unitPrice: 333, discount: 10, taxPercent: 10 })).toEqual({
      grossAmount: 999,
      discountAmount: 100,
      netAmount: 899,
      taxAmount: 90,
      totalAmount: 989,
      taxKnown: true,
    });
  });

  it("نیم به بالا", () => {
    // ۵ × ۱ = ۵؛ مالیات ۱۰٪ = ۰٫۵ → ۱
    expect(invoiceLineAmounts({ quantity: 5, unitPrice: 1, taxPercent: 10 }).taxAmount).toBe(1);
  });

  it("کالای معاف مالیات ندارد و «معلوم» است", () => {
    const line = invoiceLineAmounts({ quantity: 2, unitPrice: 1000, taxPercent: 10, taxCategory: TaxCategoryEnum.EXEMPT });
    expect(line.taxAmount).toBe(0);
    expect(line.taxKnown).toBe(true);
  });

  it("قلمِ تازه‌ی بی‌نرخ: مالیات صفر ولی «نامعلوم»", () => {
    const line = invoiceLineAmounts({ quantity: 1, unitPrice: 1000 });
    expect(line).toMatchObject({ taxAmount: 0, totalAmount: 1000, taxKnown: false });
  });

  it("ورودیِ رشته‌ای و خراب", () => {
    expect(invoiceLineAmounts({ quantity: "2", unitPrice: "500" }).totalAmount).toBe(1000);
    expect(invoiceLineAmounts(null).totalAmount).toBe(0);
  });
});

describe("invoiceTotals / savedInvoiceTotals", () => {
  const items = [
    { quantity: 3, unitPrice: 333, discount: 10, taxPercent: 10 },
    { quantity: 1, unitPrice: 1000 },
  ];

  it("جمعِ قلم‌ها و پرچمِ مالیاتِ نامعلوم", () => {
    expect(invoiceTotals(items)).toEqual({ netAmount: 1899, taxAmount: 90, totalAmount: 1989, taxUnknown: true });
    expect(invoiceTotals()).toEqual({ netAmount: 0, taxAmount: 0, totalAmount: 0, taxUnknown: false });
  });

  it("سندِ ذخیره‌شده: جمعِ سرور، مالیات از قلم‌ها", () => {
    const doc = { totalAmount: 1989, items: [{ taxAmount: 90 }, { quantity: 1, unitPrice: 1000 }] };
    expect(savedInvoiceTotals(doc)).toEqual({ netAmount: 1899, taxAmount: 90, totalAmount: 1989, taxUnknown: false });
  });
});
