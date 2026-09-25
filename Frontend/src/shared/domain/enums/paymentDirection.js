/**
 * `PaymentDirectionEnum` — جهتِ یک ردیفِ پرداخت، **از دید ما**
 * (بخش ۱۵ api-guide). روی سیم عدد است.
 *
 *   • فروش: پرداختِ مشتری `IN` است و پولی که به او برمی‌گردد `OUT`.
 *   • خرید: پرداختِ ما `OUT` است و پولی که تامین‌کننده برمی‌گرداند `IN`.
 */
export const PaymentDirectionEnum = Object.freeze({
  IN: 1,
  OUT: 2,
});

/** جهتِ «عادیِ» پرداخت روی هر نوع سند؛ جهتِ مخالف یعنی پولِ برگشتی. */
export const DOCUMENT_PAYMENT_DIRECTION = Object.freeze({
  sale: PaymentDirectionEnum.IN,
  purchase: PaymentDirectionEnum.OUT,
});

/**
 * `PaymentPurposeEnum` — این پرداخت چیست. فقط `NORMAL` از مسیرِ
 * `Add/Edit/Void...Payment` تغییر می‌کند؛ بقیه مالِ قرارداد اقساطی‌اند.
 */
export const PaymentPurposeEnum = Object.freeze({
  NORMAL: 0,
});
