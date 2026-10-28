import { describe, expect, it } from "vitest";
import { lineFromProduct } from "./lineFromProduct";

const product = { id: 5, name: "لنت", code: "P-5", unit: 0, tax: "10", taxCategory: 1 };

describe("lineFromProduct", () => {
  it("قلمِ کامل با مالیات و دانه‌ها", () => {
    expect(lineFromProduct(product, { unitPrice: "2500", quantity: 2, productUnitBarcodes: ["a"] })).toMatchObject({
      productId: 5, productName: "لنت", productCode: "P-5", quantity: 2, unitPrice: 2500, discount: 0, taxPercent: 10, taxCategory: 1, productUnitBarcodes: ["a"],
    });
  });

  it("بی مالیات، بی دانه، قیمتِ نامعتبر = ۰", () => {
    const line = lineFromProduct({ ...product, tax: null }, { unitPrice: "x", productUnitBarcodes: [] });
    expect(line).not.toHaveProperty("taxPercent");
    expect(line).not.toHaveProperty("productUnitBarcodes");
    expect([line.quantity, line.unitPrice]).toEqual([1, 0]);
    expect(lineFromProduct({ ...product, tax: 0 }).taxPercent).toBe(0);
  });
});
