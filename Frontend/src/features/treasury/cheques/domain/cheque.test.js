import { describe, expect, it } from "vitest";
import { ChequeStatusEnum } from "@/shared/domain/enums/chequeStatus";
import { BankAccountMovementKindEnum } from "@/shared/domain/enums/bankAccount";
import { PaymentDirectionEnum, PaymentPurposeEnum } from "@/shared/domain/enums/paymentDirection";
import { defaultStatementRange, isTransferMovement } from "../../bankAccounts/domain/bankAccountStatement";
import { CHEQUE_DIRECTION_LABELS, canBounceCheque, canCashCheque, canEndorseCheque, cashNeedsAccount, dueText, isEndorsedOut } from "./cheque";

const pending = { status: ChequeStatusEnum.PENDING, direction: PaymentDirectionEnum.IN, purpose: PaymentPurposeEnum.NORMAL };

describe("چرخه‌ی چک", () => {
  it("فقط چکِ در جریان (حتی با وضعیتِ رشته‌ای) سرنوشت می‌گیرد", () => {
    expect([canCashCheque, canBounceCheque, canEndorseCheque].map((can) => can(pending))).toEqual([true, true, true]);
    expect(canCashCheque({ ...pending, status: String(ChequeStatusEnum.PENDING) })).toBe(true);
    for (const status of Object.values(ChequeStatusEnum).filter((s) => s !== ChequeStatusEnum.PENDING)) {
      expect([canCashCheque, canBounceCheque, canEndorseCheque].some((can) => can({ ...pending, status }))).toBe(false);
    }
  });

  it("پیش‌پرداختِ اقساط برگشت نمی‌خورد؛ پرداختی خرج نمی‌شود", () => {
    expect(canBounceCheque({ ...pending, purpose: PaymentPurposeEnum.INSTALLMENT_DOWN_PAYMENT })).toBe(false);
    expect(canEndorseCheque({ ...pending, direction: PaymentDirectionEnum.OUT })).toBe(false);
  });

  it("حسابِ وصول و خرج‌شده", () => {
    expect(cashNeedsAccount({})).toBe(true);
    expect(cashNeedsAccount({ bankAccountId: 2 })).toBe(false);
    expect(cashNeedsAccount({ endorsedFromPaymentDetailId: 9 })).toBe(false);
    expect([isEndorsedOut({ endorsedFromPaymentDetailId: 9 }), isEndorsedOut({})]).toEqual([true, false]);
  });

  it("متنِ سررسید", () => {
    expect([dueText(0), dueText(10), dueText(-3), dueText(null), dueText(undefined)]).toEqual(["امروز", "۱۰ روز مانده", "۳ روز گذشته", null, null]);
    expect(Object.keys(CHEQUE_DIRECTION_LABELS).map(Number).sort()).toEqual(Object.values(PaymentDirectionEnum).sort());
  });
});

describe("گردشِ حساب", () => {
  it("پیش‌فرض ۳۰ روزِ اخیر، بی سقف (از مرزِ ماه و سال هم می‌گذرد)", () => {
    expect(defaultStatementRange(new Date(2026, 9, 28))).toEqual({ fromDate: "2026-09-28", toDate: "" });
    expect(defaultStatementRange(new Date(2026, 0, 10)).fromDate).toBe("2025-12-11");
  });

  it("فقط انتقال‌ها", () => {
    const kinds = Object.values(BankAccountMovementKindEnum).filter((kind) => isTransferMovement({ kind }));
    expect(kinds.sort()).toEqual([BankAccountMovementKindEnum.TRANSFER_IN, BankAccountMovementKindEnum.TRANSFER_OUT].sort());
  });
});
