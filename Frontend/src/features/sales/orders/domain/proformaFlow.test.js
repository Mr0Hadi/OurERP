import { describe, expect, it } from "vitest";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { SaleProformaEventEnum, SaleProformaStageEnum } from "@/shared/domain/enums/saleProforma";
import {
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
  const { CUSTOMER_APPROVED, WAREHOUSE_ADJUSTED, RESERVATION_RELEASED } = SaleProformaEventEnum;
  const event = (kind, note = "", userName = "انباردار") => ({ kind, note, userName });
  const sale = (events, patch = {}) => ({ proformaStage: WAREHOUSE_CHECKED, proformaEvents: events, ...patch });

  it("حضوری از پرچمِ سرور، فقط در «آماده‌ی پرداخت»", () => {
    expect(isInPersonProforma(sale([], { isInPerson: true }))).toBe(true);
    expect(isInPersonProforma(sale([], { isInPerson: false }))).toBe(false);
    expect(isInPersonProforma({ proformaStage: DRAFT, isInPerson: true })).toBe(false);
  });

  it("دلیلِ تغییرِ انبار فقط از همین دورِ تأیید", () => {
    const checked = event(SaleProformaEventEnum.WAREHOUSE_CHECKED);
    const adjusted = event(WAREHOUSE_ADJUSTED, "دو عدد کم بود", "رضا");
    expect(warehouseChangeNote(sale([event(CUSTOMER_APPROVED), adjusted, checked]))).toEqual({ note: "دو عدد کم بود", userName: "رضا" });
    expect(warehouseChangeNote(sale([adjusted, checked, event(RESERVATION_RELEASED), event(CUSTOMER_APPROVED), checked]))).toBe(null);
    expect(warehouseChangeNote(sale([checked]))).toBe(null);
    expect(warehouseChangeNote({ proformaStage: DRAFT, proformaEvents: [adjusted] })).toBe(null);
  });
});
