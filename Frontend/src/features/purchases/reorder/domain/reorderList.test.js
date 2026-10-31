import { describe, expect, it } from "vitest";
import { needsOrder, reorderPage, supplierNameOf } from "./reorderList";

const row = (productName, patch = {}) => ({ productName, stock: 0, onOrder: 0, reorderPoint: 5, suggestedQuantity: 1, ...patch });

describe("needsOrder", () => {
  it("بی سفارشِ در راه همیشه؛ با سفارش تا هدف (یا نقطه‌ی سفارش) پوشش داده نشده", () => {
    expect(needsOrder(row("a", { stock: 5 }))).toBe(true);
    expect(needsOrder(row("a", { stock: 2, onOrder: 2 }))).toBe(true);
    expect(needsOrder(row("a", { stock: 2, onOrder: 3 }))).toBe(false);
    expect(needsOrder(row("a", { stock: 2, onOrder: 3, targetStock: 10 }))).toBe(true);
  });
});

describe("reorderPage — مرتب‌سازی و صفحه‌بندیِ سمتِ کاربر", () => {
  const rows = [
    row("ج", { supplierName: "ب", stock: 3 }),
    row("الف", { supplierName: "الف", stock: 1 }),
    row("ب", { stock: 2 }),
    row("پوشش‌داده", { stock: 4, onOrder: 4 }),
  ];

  it("ردیفِ پوشش‌داده کنار می‌رود و شکلِ پاسخ مثلِ فهرستِ سرور است", () => {
    const page = reorderPage(rows, { pageIndex: 0, pageSize: 2 }, null);
    expect(page).toMatchObject({ total: 3, page: 1, totalPages: 2 });
    expect(page.items.map((r) => r.productName)).toEqual(["ج", "الف"]);
    expect(page.all).toHaveLength(3);
  });

  it("مرتب‌سازیِ فارسی؛ بی‌تامین‌کننده آخر؛ عددی", () => {
    expect(reorderPage(rows, { pageIndex: 0, pageSize: 9 }, { id: "productName", desc: false }).items.map((r) => r.productName)).toEqual(["الف", "ب", "ج"]);
    expect(reorderPage(rows, { pageIndex: 0, pageSize: 9 }, { id: "supplierName", desc: false }).items.map((r) => r.productName)).toEqual(["الف", "ج", "ب"]);
    expect(reorderPage(rows, { pageIndex: 0, pageSize: 9 }, { id: "stock", desc: true }).items.map((r) => r.stock)).toEqual([3, 2, 1]);
  });

  it("صفحه‌ی بیرون از محدوده به آخرین صفحه می‌چسبد؛ فهرستِ خالی یک صفحه", () => {
    expect(reorderPage(rows, { pageIndex: 9, pageSize: 2 }, null).page).toBe(2);
    expect(reorderPage(undefined, { pageIndex: 0, pageSize: 10 }, null)).toMatchObject({ total: 0, totalPages: 1, page: 1, items: [] });
  });
});

describe("supplierNameOf", () => {
  it("از ردیفِ پیشنهاد، وگرنه از گزینه‌ها", () => {
    expect(supplierNameOf(1, [{ supplierId: 1, supplierName: "پارس" }], [])).toBe("پارس");
    expect(supplierNameOf(2, [], [{ id: 2, companyName: "ایران" }])).toBe("ایران");
    expect(supplierNameOf(3, [], [])).toBeUndefined();
  });
});
