import { describe, expect, it } from "vitest";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { SaleProformaEventEnum, SaleProformaStageEnum } from "@/shared/domain/enums/saleProforma";
import {
  IN_PERSON_CHECK_NOTE,
  ProformaAction,
  isInPersonProforma,
  proformaAction,
  proformaPaymentType,
  warehouseChangeNote,
} from "./proformaFlow";

const { DRAFT, CUSTOMER_APPROVED, WAREHOUSE_CHECKED } = SaleProformaStageEnum;
const none = { core: false, dueDate: false, info: false, attachments: false };

describe("proformaAction — دکمه‌ی اصلیِ فرمِ فروش", () => {
  it.each([
    [{ isNew: true }, ProformaAction.CREATE],
    [{ isNew: true, isInPerson: true }, ProformaAction.RESERVE_IN_PERSON],
    [{ stage: DRAFT, changes: none }, ProformaAction.SEND_TO_WAREHOUSE],
    [{ stage: DRAFT, changes: { ...none, info: true } }, ProformaAction.SAVE],
    [{ stage: CUSTOMER_APPROVED, changes: none }, ProformaAction.AWAIT_WAREHOUSE],
    [{ stage: WAREHOUSE_CHECKED, secondsLeft: 120, changes: none }, ProformaAction.PAY],
    // در «آماده‌ی پرداخت» توضیح و سررسید مانعِ دریافت نیستند، فقط تغییرِ اصلی
    [{ stage: WAREHOUSE_CHECKED, secondsLeft: 120, changes: { ...none, dueDate: true, info: true } }, ProformaAction.PAY],
    [{ stage: WAREHOUSE_CHECKED, secondsLeft: 120, changes: { ...none, core: true } }, ProformaAction.SAVE],
    [{ stage: WAREHOUSE_CHECKED, secondsLeft: null, changes: none }, ProformaAction.PAY],
    [{ stage: WAREHOUSE_CHECKED, secondsLeft: 0, changes: none }, ProformaAction.EXPIRED],
  ])("%j → %s", (input, expected) => {
    expect(proformaAction({ isNew: false, isInPerson: false, changes: none, ...input })).toBe(expected);
  });
});

describe("proformaPaymentType", () => {
  it("اقساطی، یا مقدارِ ذخیره‌شده، یا نسیه؛ اقساطیِ قبلی بی‌قرارداد نسیه می‌شود", () => {
    expect(proformaPaymentType(true, { paymentType: PaymentTypeEnum.CASH })).toBe(PaymentTypeEnum.INSTALLMENT);
    expect(proformaPaymentType(false, { paymentType: PaymentTypeEnum.CHECK })).toBe(PaymentTypeEnum.CHECK);
    expect(proformaPaymentType(false, { paymentType: PaymentTypeEnum.INSTALLMENT })).toBe(PaymentTypeEnum.CREDIT);
    expect(proformaPaymentType(false, null)).toBe(PaymentTypeEnum.CREDIT);
  });
});

describe("فروشِ حضوری و یادداشتِ انبار", () => {
  const event = (note, userName = "انباردار") => ({ kind: SaleProformaEventEnum.WAREHOUSE_CHECKED, note, userName });
  const autoNote = "کالای همه‌ی اقلام از بررسی قبلی انبار رزرو مانده است.";
  const sale = (events) => ({ proformaStage: WAREHOUSE_CHECKED, proformaEvents: events });

  it("آخرین تأییدِ واقعیِ انبار، نه تأییدِ خودکار", () => {
    expect(isInPersonProforma(sale([event(IN_PERSON_CHECK_NOTE), event(autoNote)]))).toBe(true);
    expect(isInPersonProforma(sale([event(IN_PERSON_CHECK_NOTE), event("دو عدد کم بود")]))).toBe(false);
    expect(isInPersonProforma({ proformaStage: DRAFT, proformaEvents: [event(IN_PERSON_CHECK_NOTE)] })).toBe(false);
  });

  it("دلیلِ تغییرِ اقلام؛ یادداشتِ حضوری دلیل نیست", () => {
    expect(warehouseChangeNote(sale([event("دو عدد کم بود", "رضا")]))).toEqual({ note: "دو عدد کم بود", userName: "رضا" });
    expect(warehouseChangeNote(sale([event(IN_PERSON_CHECK_NOTE)]))).toBe(null);
    expect(warehouseChangeNote(sale([event("")]))).toBe(null);
  });
});
