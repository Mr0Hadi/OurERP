import { beforeEach, describe, expect, it, vi } from "vitest";
import { SaleProformaEventEnum, SaleProformaStageEnum as Stage } from "@/shared/domain/enums/saleProforma";
import * as api from "./api-v1";
import { createInstallmentPlan } from "@/features/sales/installments/services/api-v1";
import { approveAtWarehouse, createProforma, ensureProformaPaymentType, issueOnCredit, releaseReservation, settleProforma } from "./proformaWorkflow";

/**
 * ترتیبِ درخواست‌های چندمرحله‌ایِ پیش‌فاکتور. فقط مرزِ HTTP (`api-v1`) جایگزین می‌شود؛ هر تابع
 * همان پاسخی را می‌دهد که سرور برای آن قدم می‌دهد.
 */
vi.mock("./api-v1", () => {
  const fns = ["approveSaleProforma", "changeSaleStatus", "checkSaleWarehouse", "completeInPersonSale", "createInPersonProforma", "createSale", "releaseSaleReservation", "updateSale", "updateSaleAttachments", "updateSalePaymentDate", "addSalePayment"];
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

  it("حضوری: یک درخواستِ اتمیک با دانه‌های هر قلم، بی تأیید و بررسیِ جدا", async () => {
    api.createInPersonProforma.mockResolvedValue(sale({ proformaStage: Stage.WAREHOUSE_CHECKED }));
    const payload = { customerId: 1, items: [{ productId: 5, quantity: 2 }, { productId: 6, quantity: 1 }] };
    const result = await createProforma(payload, { scannedBarcodes: { 5: ["a", "b"], 6: ["c"] } });
    expect(result).toEqual({ id: 7, stage: Stage.WAREHOUSE_CHECKED });
    const [body, options] = api.createInPersonProforma.mock.calls[0];
    expect(body.items.map((item) => item.productUnitBarcodes)).toEqual([["a", "b"], ["c"]]);
    expect(options.idempotencyKey).toBeTruthy();
    expect([api.createSale, api.approveSaleProforma, api.checkSaleWarehouse].map((fn) => fn.mock.calls.length)).toEqual([0, 0, 0]);
  });

  it("ارسال به انبار: ثبت و تأیید؛ شکستِ تأیید partiallySaved با شناسه", async () => {
    api.createSale.mockResolvedValue({ id: 7 });
    api.approveSaleProforma.mockRejectedValue(new Error("x"));
    const error = await createProforma({}, { send: true }).catch((e) => e);
    expect(api.approveSaleProforma).toHaveBeenCalledWith(7, 0);
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

  it("تغییرِ تعداد: یک درخواست با adjustments و دلیل؛ ردیفِ تغییرکرده کامل از نو، ردیفِ حذف‌شده بی‌اسکن", async () => {
    api.checkSaleWarehouse.mockResolvedValue(sale({ proformaStage: Stage.WAREHOUSE_CHECKED }));
    await approveAtWarehouse(waiting, { quantities: { 1: 2, 2: 0 }, scans: { 1: ["a", "b", "c"], 2: ["d"] }, reason: "نبود" });
    expect(api.updateSale).not.toHaveBeenCalled();
    expect(api.approveSaleProforma).not.toHaveBeenCalled();
    expect(api.checkSaleWarehouse.mock.calls[0][0]).toMatchObject({
      revision: 3,
      adjustments: [{ saleItemId: 1, quantity: 2 }, { saleItemId: 2, quantity: 0 }],
      lines: [{ saleItemId: 1, productUnitBarcodes: ["a", "b"] }],
      note: "نبود",
    });
  });

  it("کسریِ انبار: خطا با متنِ آخرین رویداد", async () => {
    api.checkSaleWarehouse.mockResolvedValue(sale({
      proformaStage: Stage.DRAFT,
      proformaEvents: [{ kind: SaleProformaEventEnum.WAREHOUSE_SHORTAGE, note: "قدیمی" }, { kind: SaleProformaEventEnum.WAREHOUSE_SHORTAGE, note: "لنت کم است" }],
    }));
    await expect(approveAtWarehouse(waiting, { scans: {} })).rejects.toThrow("تأیید انبار ثبت نشد: لنت کم است");
  });

  it("آزادسازیِ رزرو: دستورِ خودش با revision", async () => {
    await releaseReservation(waiting);
    expect(api.releaseSaleReservation).toHaveBeenCalledWith({ saleId: 7, revision: 3 });
    expect(api.updateSale).not.toHaveBeenCalled();
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

describe("فاکتورِ نسیه", () => {
  it("اطلاعات ← صدور با PROCESSING ← سررسیدِ تازه", async () => {
    api.changeSaleStatus.mockResolvedValue("issued");
    api.updateSalePaymentDate.mockResolvedValue("dated");
    expect(await issueOnCredit(sale(), { paymentType: 0, info: { attachments: ["k"] }, paymentDate: "2026-12-01" })).toBe("dated");
    expect(api.updateSaleAttachments).toHaveBeenCalledWith(7, ["k"]);
    expect(api.changeSaleStatus).toHaveBeenCalledWith(7, 1);
    expect(api.updateSalePaymentDate).toHaveBeenCalledWith(7, "2026-12-01");
    expect(await issueOnCredit(sale(), { paymentType: 0, paymentDate: undefined })).toBe("issued");
  });
});
