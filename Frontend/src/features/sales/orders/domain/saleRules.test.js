import { describe, expect, it } from "vitest";
import { SaleStatusEnum } from "@/shared/domain/enums/saleStatus";
import { SALE_PAYMENT_SIDE } from "./salePayments";
import { SALE_PRICE_MODES, salePriceOf } from "./salePricing";
import {
  hasAnythingShipped,
  saleFormProblem,
  saleStatusOptions,
  scannedBarcodesOf,
} from "./saleRules";

const { PROCESSING, SHIPPED, DELIVERED, CANCELLED } = SaleStatusEnum;
const sale = (patch) => ({ status: PROCESSING, items: [{ shippedQuantity: 0 }], ...patch });

describe("وضعیتِ فروشِ صادرشده از پرچم‌های سرور", () => {
  it("فعلی، مقصدهای مجاز و لغو فقط با canCancel", () => {
    expect(saleStatusOptions(sale({ status: SHIPPED, allowedStatuses: [DELIVERED] })).map((o) => o.value)).toEqual([SHIPPED, DELIVERED]);
    expect(saleStatusOptions(sale({ canCancel: true })).map((o) => [o.value, o.label])).toEqual([
      [PROCESSING, expect.any(String)],
      [CANCELLED, "لغو فروش"],
    ]);
    expect(saleStatusOptions(sale({ allowedStatuses: [PROCESSING, CANCELLED] })).map((o) => o.value)).toEqual([PROCESSING]);
    expect(hasAnythingShipped({ items: [{ shippedQuantity: "2" }] })).toBe(true);
    expect(hasAnythingShipped(null)).toBe(false);
  });
});

describe("فرمِ پیش‌فاکتور و فروشِ حضوری", () => {
  const items = [
    { productId: 1, productName: "لنت", quantity: 2, productUnitBarcodes: ["a", "b"] },
    { productId: 2, productName: "روغن", quantity: 1 },
  ];

  it("مشتری، اقلام و اسکنِ کاملِ همه‌ی دانه‌ها", () => {
    expect(saleFormProblem({ formData: {}, items })).toEqual(["مشتری را انتخاب کنید.", "party"]);
    expect(saleFormProblem({ formData: { customerId: 1 }, items: [] })).toEqual(["دست‌کم یک کالا اضافه کنید.", "items"]);
    expect(saleFormProblem({ formData: { customerId: 1 }, items })).toBe(null);
    const scanned = scannedBarcodesOf(items);
    expect(scanned).toEqual({ 1: ["a", "b"] });
    const [message, section] = saleFormProblem({ formData: { customerId: 1 }, items, isInPerson: true, scannedBarcodes: scanned });
    expect(section).toBe("items");
    expect(message).toContain("روغن");
  });

  it("دو ردیفِ یک کالا: جمعِ تعدادشان باید اسکن شود", () => {
    const rows = [
      { productId: 1, productName: "لنت", quantity: 1 },
      { productId: 1, productName: "لنت", quantity: 2 },
    ];
    expect(saleFormProblem({ formData: { customerId: 1 }, items: rows, isInPerson: true, scannedBarcodes: { 1: ["a", "b"] } })).not.toBe(null);
    expect(saleFormProblem({ formData: { customerId: 1 }, items: rows, isInPerson: true, scannedBarcodes: { 1: ["a", "b", "c"] } })).toBe(null);
  });
});

describe("قیمت و سمتِ پرداخت", () => {
  it("همکار بی قیمتِ همکار به خرده برمی‌گردد؛ حالتِ ناشناخته = خرده", () => {
    expect(salePriceOf("wholesale")({ retailPrice: 100, wholeSalePrice: 80 })).toBe(80);
    expect(salePriceOf("wholesale")({ retailPrice: 100 })).toBe(100);
    expect(salePriceOf("unknown")({ retailPrice: 100, wholeSalePrice: 80 })).toBe(100);
    expect(SALE_PRICE_MODES.retail.priceOf({})).toBe(0);
    expect(SALE_PAYMENT_SIDE.direction).toBe(1);
  });
});
