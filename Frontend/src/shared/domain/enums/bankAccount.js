/**
 * صندوق و حسابِ بانکی (`api-guide.fa.md` بخش‌های ۱۵ و ۲۳). مقادیر عیناً همان enumهای بکندند؛ روی سیم عدد.
 */

/** `BankAccountKindEnum` — نوعِ حساب. */
export const BankAccountKindEnum = Object.freeze({
  CASH_BOX: 1,
  BANK: 2,
});

export const BANK_ACCOUNT_KIND_LABELS = Object.freeze({
  [BankAccountKindEnum.CASH_BOX]: "صندوق",
  [BankAccountKindEnum.BANK]: "حساب بانکی",
});

/** `BankAccountMovementKindEnum` — نوعِ ردیفِ گردشِ حساب. */
export const BankAccountMovementKindEnum = Object.freeze({
  PAYMENT: 1,
  TRANSFER_IN: 2,
  TRANSFER_OUT: 3,
});

export const BANK_ACCOUNT_MOVEMENT_LABELS = Object.freeze({
  [BankAccountMovementKindEnum.PAYMENT]: "دریافت/پرداخت",
  [BankAccountMovementKindEnum.TRANSFER_IN]: "انتقال به این حساب",
  [BankAccountMovementKindEnum.TRANSFER_OUT]: "انتقال از این حساب",
});
