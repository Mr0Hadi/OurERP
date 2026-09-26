import DocumentPaymentsCard from "@/shared/components/payments/DocumentPaymentsCard";
import { PaymentDirectionEnum } from "@/shared/domain/enums/paymentDirection";
import { PaymentTypeEnum } from "@/shared/domain/enums/paymentType";
import { SaleStatusEnum } from "@/shared/domain/enums/saleStatus";

const SALE_PAYMENT_SIDE = {
  // در فروش، پرداختِ مشتری `IN` است و پولی که به او برمی‌گردد `OUT`.
  direction: PaymentDirectionEnum.IN,
  payLabel: "ثبت دریافت از مشتری",
  refundLabel: "پول برگشتی به مشتری",
  refundHint:
    "پولی که به مشتری برگردانده شده است. نمی‌تواند از مبلغ پرداخت‌شده بیشتر باشد.",
};

/**
 * پرداخت‌های یک فروش (`Add/Edit/VoidSalePayment`).
 *
 * - روی پیش‌فاکتور، اولین دریافت فاکتور را صادر می‌کند و فروش قفل می‌شود.
 * - روی فروشِ لغوشده فقط پولِ برگشتی پذیرفته می‌شود.
 * - فروشِ اقساطی پولش را از قرارداد اقساطی می‌گیرد، نه از این مسیر؛
 *   ردیف‌های اقساطی فقط نمایش داده می‌شوند.
 *
 * @param payments خروجیِ `useSalePaymentMutations`.
 */
export default function SalePaymentsCard({
  sale,
  payments,
  canManage,
  notice,
}) {
  const isPending =
    payments.add.isPending ||
    payments.edit.isPending ||
    payments.void.isPending;
  const isInstallment = sale.paymentType === PaymentTypeEnum.INSTALLMENT;

  return (
    <DocumentPaymentsCard
      payments={sale.paymentDetails}
      side={SALE_PAYMENT_SIDE}
      totalAmount={sale.totalAmount}
      payableAmount={sale.payableAmount}
      paidAmount={sale.paidAmount}
      canManage={canManage && !isInstallment}
      refundOnly={sale.status === SaleStatusEnum.CANCELLED}
      notice={
        isInstallment
          ? "پرداخت‌های فروش اقساطی از قرارداد اقساط ثبت می‌شوند."
          : notice
      }
      isPending={isPending}
      onAdd={(values, options) => payments.add.mutate(values, options)}
      onEdit={(paymentId, values, options) =>
        payments.edit.mutate({ ...values, paymentId }, options)
      }
      onVoid={(paymentId, options) => payments.void.mutate(paymentId, options)}
    />
  );
}
