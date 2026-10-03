import { PaymentDirectionEnum } from "@/shared/domain/enums/paymentDirection";

/** جهت و متن‌های پرداخت روی فروش (`PaymentsCard`). */
export const SALE_PAYMENT_SIDE = {
  // در فروش، پرداختِ مشتری `IN` است و پولی که به او برمی‌گردد `OUT`.
  direction: PaymentDirectionEnum.IN,
  payLabel: "دریافت از مشتری",
  refundLabel: "پول برگشتی به مشتری",
};
