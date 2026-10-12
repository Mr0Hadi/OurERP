import { PAYMENT_PURPOSE_LABELS, PaymentPurposeEnum } from "@/shared/domain/enums/paymentDirection";

/**
 * برچسبِ همه‌ی `PaymentPurposeEnum`ها برای فیلتر و جدولِ دفترِ پرداخت. واژگانِ مشترک فقط
 * پرداخت‌های قرارداد اقساطی را برچسب می‌زند (روی کارتِ پرداختِ سند «عادی» لازم نیست)؛
 * اینجا «عادی» هم یک گزینه است.
 */
export const PAYMENT_PURPOSE_FILTER_LABELS = Object.freeze({
  [PaymentPurposeEnum.NORMAL]: "پرداختِ عادی",
  ...PAYMENT_PURPOSE_LABELS,
});
