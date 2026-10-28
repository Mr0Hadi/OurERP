import { describe, expect, it } from "vitest";
import { BarcodeReferenceKindEnum as K } from "@/shared/domain/enums/barcodeReferenceKind";
import { barcodeSegments, parseBarcode, productCodeOf } from "./productCode";

describe("parseBarcode", () => {
  it("کالا و دانه، با صفرِ چپِ حذف‌شده مثلِ سرور", () => {
    expect(parseBarcode("20261028-010")).toEqual({ kind: K.PRODUCT, normalizedPayload: "20261028-10", productId: 10, serialNumber: null });
    expect(parseBarcode("20261028-10-007")).toEqual({ kind: K.UNIT, normalizedPayload: "20261028-10-7", productId: 10, serialNumber: 7 });
  });

  it("ورودیِ صفحه‌کلیدِ فارسی و اسکنر: رقمِ فارسی/عربی، خط‌تیره‌ی دیگر، فاصله، کشیده", () => {
    for (const input of ["۲۰۲۶۱۰۲۸-۱۰-۷", "٢٠٢٦١٠٢٨–10—7", " 20261028 - 10 - 7 ", "20261028ـ10−7", "20261028－10‐7"]) {
      expect(parseBarcode(input).normalizedPayload, input).toBe("20261028-10-7");
    }
  });

  it("شکلِ ناشناخته به سرور نمی‌رود", () => {
    for (const input of ["", null, undefined, "abc", "2026102-10", "20261028", "20261028-", "20261028-1-2-3", "20261028-12345678901"]) {
      expect(parseBarcode(input).kind, String(input)).toBe(K.UNKNOWN);
    }
    expect(parseBarcode("x y").normalizedPayload).toBe("xy");
  });
});

describe("بخش‌ها و کدِ کالا", () => {
  it("دانه → کدِ کالا؛ کالا یا ناشناخته → خالی", () => {
    expect(barcodeSegments("20261028-010-3")).toEqual(["20261028", "10", "3"]);
    expect(barcodeSegments("نامعتبر")).toEqual(["نامعتبر"]);
    expect(barcodeSegments(null)).toEqual([""]);
    expect(productCodeOf("20261028-010-3")).toBe("20261028-10");
    expect(productCodeOf("20261028-10")).toBe("");
    expect(productCodeOf("x")).toBe("");
  });
});
