import { describe, expect, it } from "vitest";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import {
  addMixedRow,
  liveRows,
  materializeRows,
  newPaymentRow,
  removeMixedRow,
  resolvedRows,
  rowsTotal,
  switchMethod,
} from "./paymentSplit";

const { CASH, CHECK, TRANSFER, MIXED } = PaymentTypeEnum;
const row = (type, amount, id = `${type}-${amount}`) => ({ ...newPaymentRow(type, amount), id });

describe("resolvedRows", () => {
  it("بی ردیف: یک ردیفِ نقدیِ «کلِ مانده»", () => {
    const [only] = resolvedRows(undefined, 5000);
    expect(only).toMatchObject({ type: CASH, amount: 5000, auto: true });
  });

  it("ترکیبی: ردیفِ خودکار باقیمانده را می‌گیرد، هرگز منفی نه", () => {
    const split = { method: MIXED, rows: [row(CASH, 3000), row(CHECK, null)] };
    expect(resolvedRows(split, 5000).map((r) => r.amount)).toEqual([3000, 2000]);
    expect(resolvedRows(split, 1000).map((r) => r.amount)).toEqual([3000, 0]);
  });
});

describe("materializeRows", () => {
  it("ردیفِ پیش‌فرض قابلِ ویرایش و همچنان خودکار", () => {
    const { method, rows } = materializeRows(undefined, 7000);
    expect(method).toBe(CASH);
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(null);
  });
});

describe("switchMethod", () => {
  it("تکی → تکی: فقط نوع عوض می‌شود و مبلغ می‌ماند", () => {
    const next = switchMethod({ method: CASH, rows: [row(CASH, 1200)] }, TRANSFER);
    expect(next).toMatchObject({ method: TRANSFER, rows: [{ type: TRANSFER, amount: 1200 }] });
  });

  it("تکی → ترکیبی: ردیفِ «کلِ مانده» صفر می‌شود و تکه‌ی دوم خودکار با نوعِ دیگر", () => {
    const next = switchMethod({ method: CASH, rows: [row(CASH, null)] }, MIXED);
    expect(next.method).toBe(MIXED);
    expect(next.rows.map((r) => [r.type, r.amount])).toEqual([[CASH, 0], [TRANSFER, null]]);
  });

  it("ترکیبی → تکی: «کلِ مانده»", () => {
    const next = switchMethod({ method: MIXED, rows: [row(CHECK, 500), row(CASH, null)] }, CHECK);
    expect(next.rows).toHaveLength(1);
    expect(next.rows[0]).toMatchObject({ type: CHECK, amount: null });
  });
});

describe("add / remove در ترکیبی", () => {
  it("افزودن: خودکارِ قبلی صریح می‌شود، تکه‌ی تازه نوعِ استفاده‌نشده و خودکار", () => {
    const split = { method: MIXED, rows: [row(CASH, 3000), row(TRANSFER, null)] };
    const next = addMixedRow(split, 5000);
    expect(next.rows.map((r) => [r.type, r.amount])).toEqual([[CASH, 3000], [TRANSFER, 2000], [CHECK, null]]);
  });

  it("حذف تا یک تکه: روشِ تکیِ همان تکه، «کلِ مانده»", () => {
    const split = { method: MIXED, rows: [row(CASH, 3000, "a"), row(CHECK, null, "b")] };
    expect(removeMixedRow(split, "b")).toMatchObject({ method: CASH, rows: [{ id: "a", amount: null }] });
  });

  it("حذفِ تکه‌ی خودکار: آخرین تکه خودکار می‌شود", () => {
    const split = { method: MIXED, rows: [row(CASH, 1, "a"), row(CHECK, 2, "b"), row(TRANSFER, null, "c")] };
    const next = removeMixedRow(split, "c");
    expect(next.rows.map((r) => r.amount)).toEqual([1, null]);
  });
});

describe("جمع و ردیف‌های زنده", () => {
  it("تکه‌ی صفر فرستاده نمی‌شود", () => {
    const rows = [row(CASH, 0), row(CHECK, 2500), row(TRANSFER, "")];
    expect(rowsTotal(rows)).toBe(2500);
    expect(liveRows(rows).map((r) => r.type)).toEqual([CHECK]);
  });
});
