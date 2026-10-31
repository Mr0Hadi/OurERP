import { describe, expect, it } from "vitest";
import { SaleStatusEnum } from "@/shared/domain/enums/saleStatus";
import { SaleInstallmentPlanStatusEnum } from "@/shared/domain/enums/saleInstallment";
import { SALE_PAYMENT_SIDE } from "./salePayments";
import { SALE_PRICE_MODES, salePriceOf } from "./salePricing";
import {
  RETURNABLE_SALE_STATUSES,
  canCancelSale,
  hasAnythingShipped,
  saleFormProblem,
  saleStatusOptions,
  scannedBarcodesOf,
} from "./saleRules";

const { PROCESSING, PARTIALLY_DELIVERED, SHIPPED, DELIVERED, CANCELLED } = SaleStatusEnum;
const sale = (patch) => ({ status: PROCESSING, items: [{ shippedQuantity: 0 }], ...patch });

describe("لغوِ فروش", () => {
  it("پیش از هر ارسال و بی قراردادِ اقساطیِ جاری", () => {
    expect(canCancelSale(sale())).toBe(true);
    expect(canCancelSale(sale({ items: [{ shippedQuantity: 1 }] }))).toBe(false);
    expect(canCancelSale(sale({ status: CANCELLED }))).toBe(false);
    expect(canCancelSale(sale({ status: DELIVERED }))).toBe(false);
    expect(canCancelSale(sale({ installmentSummary: { status: SaleInstallmentPlanStatusEnum.ACTIVE } }))).toBe(false);
    expect(canCancelSale(sale({ installmentSummary: { status: SaleInstallmentPlanStatusEnum.CANCELLED } }))).toBe(true);
    expect(hasAnythingShipped({ items: [{ shippedQuantity: "2" }] })).toBe(true);
    expect(hasAnythingShipped(null)).toBe(false);
  });

  it("گزینه‌های وضعیت: فقط «ارسال شده → تحویل کامل» و لغو", () => {
    expect(saleStatusOptions(sale({ status: SHIPPED, items: [{ shippedQuantity: 1 }] })).map((o) => o.value)).toEqual([SHIPPED, DELIVERED]);
    expect(saleStatusOptions(sale()).map((o) => [o.value, o.label])).toEqual([
      [PROCESSING, expect.any(String)],
      [CANCELLED, "لغو فروش"],
    ]);
    expect(RETURNABLE_SALE_STATUSES).toEqual([PARTIALLY_DELIVERED, SHIPPED, DELIVERED]);
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
