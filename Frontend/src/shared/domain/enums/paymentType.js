// src/shared/domain/enums/paymentType.js

/**
 * `PaymentTypeEnum` — نوع پرداخت (بخش ۱۵ سند api-guide.fa.md).
 * مقادیر باید دقیقاً با اعداد بکند یکی بمانند؛ روی سیم همیشه عدد است.
 *
 * فقط فیلدِ سطحِ‌بالای `paymentType` روی Purchase/Sale را می‌پوشاند.
 * شکستن پرداخت ترکیبی به چند ردیف (`mixedPayments` در فرانت) معادل
 * مستندی در بکند ندارد — سند از `paymentDetails` حرف می‌زند، شکلی که
 * فرانت هنوز پیاده نکرده. آن هماهنگی جدا می‌ماند.
 */
export const PaymentTypeEnum = Object.freeze({
  CASH: 0,
  CREDIT: 1,
  CHECK: 2,
  TRANSFER: 3,
  MIXED: 4,
});

export const PAYMENT_TYPE_LABELS = Object.freeze({
  [PaymentTypeEnum.CASH]: "نقدی",
  [PaymentTypeEnum.CREDIT]: "نسیه",
  [PaymentTypeEnum.CHECK]: "چک",
  [PaymentTypeEnum.TRANSFER]: "انتقال بانکی",
  [PaymentTypeEnum.MIXED]: "ترکیبی",
});
