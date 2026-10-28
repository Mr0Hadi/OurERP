import { beforeEach, describe, expect, it, vi } from "vitest";
import { SaleProformaEventEnum, SaleProformaStageEnum as Stage } from "@/shared/domain/enums/saleProforma";
import * as api from "./api-v1";
import { createInstallmentPlan } from "@/features/sales/installments/services/api-v1";
import { approveAtWarehouse, createProforma, ensureProformaPaymentType, releaseReservation, settleProforma } from "./proformaWorkflow";

/**
 * ترتیبِ درخواست‌های چندمرحله‌ایِ پیش‌فاکتور. فقط مرزِ HTTP (`api-v1`) جایگزین می‌شود؛ هر تابع
 * همان پاسخی را می‌دهد که سرور برای آن قدم می‌دهد.
 */
vi.mock("./api-v1", () => {
  const fns = ["approveSaleProforma", "checkSaleWarehouse", "completeInPersonSale", "createSale", "updateSale", "updateSaleAttachments", "updateSalePaymentDate", "addSalePayment"];
  const module = Object.fromEntries(fns.map((name) => [name, vi.fn()]));
  module.SALE_DOCUMENT_CHANGES_API = { idField: "saleId", addPayment: module.addSalePayment, paymentDate: module.updateSalePaymentDate };
  return module;
});
vi.mock("@/features/sales/installments/services/api-v1", () => ({ createInstallmentPlan: vi.fn() }));

beforeEach(() => vi.resetAllMocks());

const sale = (patch = {}) => ({ id: 7, revision: 3, paymentType: 0, items: [], proformaStage: Stage.DRAFT, ...patch });

describe("ثبتِ پیش‌فاکتور", () => {
  it("ذخیره‌ی ساده: فقط ثبت، با کلیدِ ایدمپوتنسی", async () => {
    api.createSale.mockResolvedValue({ id: 7 });
    expect(await createProforma({ customerId: 1 }, { send: false })).toEqual({ id: 7, stage: Stage.DRAFT });
    expect(api.createSale.mock.calls[0][1].idempotencyKey).toBeTruthy();
    expect(api.approveSaleProforma).not.toHaveBeenCalled();
  });

  it("حضوری: دانه‌های اسکن‌شده بینِ دو قلمِ یک کالا تقسیم و فقط کسریِ رزرو فرستاده می‌شود", async () => {
    api.createSale.mockResolvedValue({ id: 7 });
    api.approveSaleProforma.mockResolvedValue(sale({
      proformaStage: Stage.CUSTOMER_APPROVED,
      items: [{ id: 1, productId: 5, quantity: 2, reservedQuantity: 0 }, { id: 2, productId: 5, quantity: 2, reservedQuantity: 1 }, { id: 3, productId: 6, quantity: 1 }],
    }));
    api.checkSaleWarehouse.mockResolvedValue(sale({ proformaStage: Stage.WAREHOUSE_CHECKED }));
    const result = await createProforma({}, { scannedBarcodes: { 5: ["a", "b", "c"], 6: [] } });
    expect(result).toEqual({ id: 7, stage: Stage.WAREHOUSE_CHECKED });
    expect(api.approveSaleProforma).toHaveBeenCalledWith(7, 0);
    expect(api.checkSaleWarehouse.mock.calls[0][0]).toMatchObject({
      saleId: 7, revision: 3,
      lines: [{ saleItemId: 1, productUnitBarcodes: ["a", "b"] }, { saleItemId: 2, productUnitBarcodes: ["c"] }, { saleItemId: 3, productUnitBarcodes: [] }],
    });
  });

  it("کسریِ انبار بعد از ثبت: خطا با شناسه‌ی پیش‌فاکتور و متنِ آخرین رویداد", async () => {
    api.createSale.mockResolvedValue({ id: 7 });
    api.approveSaleProforma.mockResolvedValue(sale({ proformaStage: Stage.CUSTOMER_APPROVED }));
    api.checkSaleWarehouse.mockResolvedValue(sale({
      proformaStage: Stage.CUSTOMER_APPROVED,
      proformaEvents: [{ kind: SaleProformaEventEnum.WAREHOUSE_SHORTAGE, note: "قدیمی" }, { kind: SaleProformaEventEnum.WAREHOUSE_SHORTAGE, note: "لنت کم است" }],
    }));
    const error = await createProforma({}, { scannedBarcodes: { 5: ["a"] } }).catch((e) => e);
    expect(error.message).toBe("رزروِ دانه‌ها ثبت نشد: لنت کم است");
    expect([error.partiallySaved, error.saleId]).toEqual([true, 7]);
  });

  it("شکستِ خودِ ثبت partiallySaved نیست", async () => {
    api.createSale.mockRejectedValue(new Error("۵۰۰"));
    const error = await createProforma({}, { send: true }).catch((e) => e);
    expect(error.partiallySaved).toBeUndefined();
  });
});

describe("تأییدِ انبار", () => {
  const waiting = sale({ proformaStage: Stage.CUSTOMER_APPROVED, items: [{ id: 1, quantity: 3, reservedQuantity: 1 }, { id: 2, quantity: 1 }] });

  it("بی تغییرِ تعداد: فقط اسکن‌های لازم، ردیفِ خالی نه", async () => {
    api.checkSaleWarehouse.mockResolvedValue(sale({ proformaStage: Stage.WAREHOUSE_CHECKED }));
    await approveAtWarehouse(waiting, { scans: { 1: ["a", "b", "c"] }, reason: "" });
    expect(api.updateSale).not.toHaveBeenCalled();
    expect(api.checkSaleWarehouse.mock.calls[0][0]).toMatchObject({ lines: [{ saleItemId: 1, productUnitBarcodes: ["a", "b"] }], issues: [], note: null });
  });

  it("تغییرِ تعداد: قلمِ صفر حذف، تأییدِ دوباره با revisionِ تازه", async () => {
    api.updateSale.mockResolvedValue({ revision: 9 });
    api.approveSaleProforma.mockResolvedValue({ ...waiting, revision: 10 });
    api.checkSaleWarehouse.mockResolvedValue(sale({ proformaStage: Stage.WAREHOUSE_CHECKED }));
    await approveAtWarehouse(waiting, { quantities: { 2: 0 }, scans: {}, reason: "نبود" });
    expect(api.updateSale.mock.calls[0][1].items.map((item) => item.id)).toEqual([1]);
    expect(api.approveSaleProforma).toHaveBeenCalledWith(7, 9);
    expect(api.checkSaleWarehouse.mock.calls[0][0]).toMatchObject({ revision: 10, note: "نبود" });
  });

  it("تأییدِ دوباره که مستقیم آماده‌ی پرداخت شد: گزارشِ معیوب جا نمی‌ماند بی‌صدا", async () => {
    api.updateSale.mockResolvedValue({ revision: 9 });
    api.approveSaleProforma.mockResolvedValue(sale({ proformaStage: Stage.WAREHOUSE_CHECKED }));
    await expect(approveAtWarehouse(waiting, { quantities: { 1: 2 }, scans: {}, issues: [{ productUnitBarcode: "x" }] })).rejects.toThrow("قرنطینه");
    expect(api.checkSaleWarehouse).not.toHaveBeenCalled();
  });

  it("شکستِ تأییدِ دوباره پیامِ «به پیش‌نویس برگشت» دارد", async () => {
    api.updateSale.mockResolvedValue({ revision: 9 });
    api.approveSaleProforma.mockRejectedValue(new Error("x"));
    await expect(approveAtWarehouse(waiting, { quantities: { 1: 2 }, scans: {} })).rejects.toThrow("پیش‌نویس برگشت");
  });

  it("آزادسازیِ رزرو: همه‌ی قلم‌ها با id صفر", async () => {
    await releaseReservation(waiting);
    expect(api.updateSale.mock.calls[0][1].items.map((item) => item.id)).toEqual([0, 0]);
  });
});

describe("تسویه", () => {
  it("شیوه‌ی پرداختِ همان: بی درخواست؛ دیگر: ویرایش و تأیید، و مهلتِ گذشته خطا", async () => {
    expect(await ensureProformaPaymentType(sale({ paymentType: "2" }), 2)).toEqual(sale({ paymentType: "2" }));
    expect(api.updateSale).not.toHaveBeenCalled();
    api.updateSale.mockResolvedValue({ revision: 4 });
    api.approveSaleProforma.mockResolvedValue(sale({ proformaStage: Stage.CUSTOMER_APPROVED }));
    await expect(ensureProformaPaymentType(sale(), 1)).rejects.toThrow("مهلتِ رزرو گذشته");
    expect(api.approveSaleProforma).toHaveBeenCalledWith(7, 4);
  });

  it("اقساطی: قرارداد، بعد تاریخِ پرداخت؛ تحویلِ حضوری با یک درخواست", async () => {
    createInstallmentPlan.mockResolvedValue("plan");
    expect(await settleProforma(sale(), { paymentType: 0, plan: { months: 3 }, paymentDate: "2026-10-28" })).toBe("plan");
    expect(createInstallmentPlan.mock.calls[0][0]).toEqual({ saleId: 7, months: 3 });
    expect(api.updateSalePaymentDate).toHaveBeenCalledWith(7, "2026-10-28");

    api.completeInPersonSale.mockResolvedValue("done");
    await settleProforma(sale(), { paymentType: 0, plan: { months: 3 }, deliver: true, paymentDate: "x" });
    expect(api.completeInPersonSale.mock.calls[0][0]).toEqual({ saleId: 7, installmentPlan: { months: 3 } });
    expect(api.updateSalePaymentDate).toHaveBeenCalledTimes(1);
  });

  it("تحویلِ حضوریِ نقدی فقط ردیف‌های تازه را می‌فرستد", async () => {
    await settleProforma(sale(), { paymentType: 0, deliver: true, payments: { rows: [{ pending: "add", amount: 1 }, { pending: null, amount: 2 }] } });
    expect(api.completeInPersonSale.mock.calls[0][0]).toEqual({ saleId: 7, paymentRows: [{ pending: "add", amount: 1 }] });
  });

  it("اطلاعاتِ پیش‌فاکتور: ویرایشِ کامل یا فقط پیوست", async () => {
    await settleProforma(sale(), { paymentType: 0, info: { attachments: ["k"] }, payments: { operations: [] } });
    expect(api.updateSaleAttachments).toHaveBeenCalledWith(7, ["k"]);
    expect(api.updateSale).not.toHaveBeenCalled();
  });
});
