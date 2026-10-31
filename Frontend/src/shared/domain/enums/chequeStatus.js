/**
 * `PaymentCheckStatusEnum` — جای یک چک (ردیفِ پرداختِ `CHECK`) در چرخه‌اش (`api-guide.fa.md` بخش ۲۴). روی ردیف‌های
 * غیرچک `null` است. روی سیم عدد.
 */
export const ChequeStatusEnum = Object.freeze({
  PENDING: 1,
  CASHED: 2,
  BOUNCED: 3,
  ENDORSED: 4,
});

export const CHEQUE_STATUS_LABELS = Object.freeze({
  [ChequeStatusEnum.PENDING]: "در جریان",
  [ChequeStatusEnum.CASHED]: "وصول‌شده",
  [ChequeStatusEnum.BOUNCED]: "برگشتی",
  [ChequeStatusEnum.ENDORSED]: "خرج‌شده",
});

export const CHEQUE_STATUS_TONES = Object.freeze({
  [ChequeStatusEnum.PENDING]: "warning",
  [ChequeStatusEnum.CASHED]: "success",
  [ChequeStatusEnum.BOUNCED]: "danger",
  [ChequeStatusEnum.ENDORSED]: "info",
});
