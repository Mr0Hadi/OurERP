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

/**
 * `PaymentPurposeEnum` — این پرداخت چیست. فقط `NORMAL` از مسیرِ
 * `Add/Edit/Void...Payment` تغییر می‌کند؛ بقیه مالِ قرارداد اقساطی‌اند.
 */
export const PaymentPurposeEnum = Object.freeze({
  NORMAL: 0,
  INSTALLMENT_DOWN_PAYMENT: 1,
  INSTALLMENT: 2,
});

/** برچسبِ ردیف‌های پرداختِ قرارداد اقساطی (پرداختِ عادی برچسب ندارد). */
export const PAYMENT_PURPOSE_LABELS = Object.freeze({
  [PaymentPurposeEnum.INSTALLMENT_DOWN_PAYMENT]: "پیش‌پرداخت",
  [PaymentPurposeEnum.INSTALLMENT]: "قسط",
});
