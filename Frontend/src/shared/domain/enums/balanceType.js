// src/shared/domain/enums/balanceType.js

/**
 * `BalanceTypeEnum` — نوع مانده حساب مشتری/تامین‌کننده.
 * مقادیر باید دقیقاً با اعداد بکند یکی بمانند (بخش ۱۵ سند api-guide.fa.md).
 * روی سیم همیشه عدد است؛ اینجا رشته نیست.
 */
export const BalanceTypeEnum = Object.freeze({
  CREDITOR: 0,
  DEBTOR: 1,
  BALANCED: 2,
});
