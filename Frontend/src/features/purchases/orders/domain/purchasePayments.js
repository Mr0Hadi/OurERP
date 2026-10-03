import { PaymentDirectionEnum } from "@/shared/domain/enums/paymentDirection";

/** جهت و متن‌های پرداخت روی خرید (`DocumentPaymentsEditor`). */
export const PURCHASE_PAYMENT_SIDE = {
  // در خرید، پرداختِ ما `OUT` است و پولی که تامین‌کننده برمی‌گرداند `IN`.
  direction: PaymentDirectionEnum.OUT,
  payLabel: "پرداخت به تامین‌کننده",
  refundLabel: "پول برگشتی از تامین‌کننده",
};
