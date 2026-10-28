import { describe, expect, it, vi } from "vitest";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { partialSaveMessage, runDocumentChanges } from "./documentChanges";

function fakeApi(failOn) {
  const calls = [];
  const step = (name) => vi.fn(async (...args) => {
    calls.push([name, ...args]);
    if (name === failOn) throw new Error(name);
    return { step: name };
  });
  return {
    calls,
    idField: "saleId",
    update: step("update"),
    voidPayment: step("voidPayment"),
    editPayment: step("editPayment"),
    addPayment: step("addPayment"),
    paymentDate: step("paymentDate"),
    attachments: step("attachments"),
    status: step("status"),
  };
}

const cash = (amount) => ({ type: PaymentTypeEnum.CASH, amount, direction: 1 });

describe("ذخیره‌ی چندمرحله‌ای", () => {
  it("ترتیب: ویرایش، پرداخت‌ها، تاریخ، پیوست، وضعیت؛ هر عملیاتِ پرداخت settle می‌شود", async () => {
    const api = fakeApi();
    const settle = vi.fn();
    const operations = [
      { kind: "void", paymentId: 1 },
      { kind: "edit", paymentId: 2, values: cash(10) },
      { kind: "add", id: "draft-a", values: cash(5) },
      { kind: "add", id: "draft-b", values: cash(5) },
    ];
    const latest = await runDocumentChanges(api, 9, {
      update: { note: "x" }, paymentDraft: { operations, settle }, paymentDate: null, attachments: [], status: 0,
    });
    expect(api.calls.map(([name]) => name)).toEqual(["update", "voidPayment", "editPayment", "addPayment", "addPayment", "paymentDate", "attachments", "status"]);
    expect(latest).toEqual({ step: "status" });
    expect(settle.mock.calls.map(([op]) => op)).toEqual(operations);

    const [, editPayload] = api.calls[2];
    expect(editPayload).toMatchObject({ paymentId: 2, amount: 10 });
    expect(editPayload).not.toHaveProperty("direction");
    const [[, firstAdd, firstOptions], [, secondAdd, secondOptions]] = api.calls.slice(3, 5);
    expect(firstAdd).toMatchObject({ saleId: 9, direction: 1 });
    expect(firstAdd).toEqual(secondAdd);
    // دو دریافتِ هم‌مبلغ دو قصدِ جدا: کلیدِ ایدمپوتنسیِ متفاوت.
    expect(firstOptions.idempotencyKey).not.toBe(secondOptions.idempotencyKey);
  });

  it("بی تغییر: هیچ درخواست و نتیجه‌ی null؛ تاریخِ undefined فرستاده نمی‌شود", async () => {
    const api = fakeApi();
    expect(await runDocumentChanges(api, 1, {})).toBe(null);
    expect(api.calls).toEqual([]);
  });

  it("شکستِ میانه: partiallySaved فقط اگر قدمی ذخیره شده بود", async () => {
    const midway = fakeApi("attachments");
    const error = await runDocumentChanges(midway, 1, { update: {}, attachments: [] }).catch((e) => e);
    expect([error.message, error.partiallySaved]).toEqual(["attachments", true]);
    expect(partialSaveMessage(error, "ذخیره نشد")).toContain("بخشی از تغییرات ذخیره شد");

    const first = await runDocumentChanges(fakeApi("update"), 1, { update: {}, status: 1 }).catch((e) => e);
    expect(first.partiallySaved).toBe(false);
    expect(partialSaveMessage(first, "ذخیره نشد")).toBe("ذخیره نشد");
    expect(partialSaveMessage(null, "x")).toBe("x");
  });
});
