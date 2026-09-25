import DocumentPaymentsCard from "@/shared/components/payments/DocumentPaymentsCard";
import { PaymentDirectionEnum } from "@/shared/domain/enums/paymentDirection";
import { PURCHASE_STATUSES } from "../../services/constants";

const PURCHASE_PAYMENT_SIDE = {
  // در خرید، پرداختِ ما `OUT` است و پولی که تامین‌کننده برمی‌گرداند `IN`.
  direction: PaymentDirectionEnum.OUT,
  payLabel: "ثبت پرداخت به تامین‌کننده",
  refundLabel: "پول برگشتی از تامین‌کننده",
  refundHint:
    "پولی که تامین‌کننده به ما برگردانده است. نمی‌تواند از مبلغ پرداخت‌شده بیشتر باشد.",
};

/**
 * پرداخت‌های یک خرید (`Add/Edit/VoidPurchasePayment`). روی خریدِ
 * لغوشده فقط پولِ برگشتی پذیرفته می‌شود.
 *
 * @param payments خروجیِ `usePurchasePaymentMutations`.
 */
export default function PurchasePaymentsCard({
  purchase,
  payments,
  canManage,
  notice,
}) {
  const isPending =
    payments.add.isPending ||
    payments.edit.isPending ||
    payments.void.isPending;

  return (
    <DocumentPaymentsCard
      payments={purchase.paymentDetails}
      side={PURCHASE_PAYMENT_SIDE}
      totalAmount={purchase.totalAmount}
      payableAmount={purchase.payableAmount}
      paidAmount={purchase.paidAmount}
      canManage={canManage}
      refundOnly={purchase.status === PURCHASE_STATUSES.CANCELLED}
      notice={notice}
      isPending={isPending}
      onAdd={(values, options) => payments.add.mutate(values, options)}
      onEdit={(paymentId, values, options) =>
        payments.edit.mutate({ ...values, paymentId }, options)
      }
      onVoid={(paymentId, options) => payments.void.mutate(paymentId, options)}
    />
  );
}
