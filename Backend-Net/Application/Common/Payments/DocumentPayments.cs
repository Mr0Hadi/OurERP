using Common.Exceptions;
using Domain.Entities;
using Domain.Enums;

namespace Application.Common.Payments
{
    /// <summary>
    /// The one definition of what "paid" means on a sale or purchase. PaidAmount on the document is never taken
    /// from a client: it is recomputed from the payment rows by every command that adds or voids one, in the same
    /// SaveChanges, so the number and the rows cannot disagree.
    /// </summary>
    public static class DocumentPayments
    {
        /// <summary>Money a customer pays us.</summary>
        public const PaymentDirectionEnum SaleDirection = PaymentDirectionEnum.IN;

        /// <summary>Money we pay a supplier.</summary>
        public const PaymentDirectionEnum PurchaseDirection = PaymentDirectionEnum.OUT;

        /// <summary>
        /// Methods a single payment row can carry. MIXED is several rows, INSTALLMENT is the installment feature's
        /// own rows - neither describes one movement of money.
        /// </summary>
        public static bool IsRowMethod(PaymentTypeEnum type) =>
            type is PaymentTypeEnum.CASH or PaymentTypeEnum.CREDIT or PaymentTypeEnum.CHECK or PaymentTypeEnum.TRANSFER;

        /// <summary>
        /// Rows in the document's own direction minus rows the other way (refunds), voided rows excluded. Throws when
        /// refunds would exceed what was paid - that is the one state the rows are never allowed to reach.
        /// </summary>
        public static ulong NetPaid(IEnumerable<PaymentDetail> payments, PaymentDirectionEnum documentDirection)
        {
            var net = 0m;
            foreach (var payment in payments.Where(p => p.VoidedAt == null))
                net += payment.Direction == documentDirection ? payment.Amount : -payment.Amount;

            if (net < 0)
                throw new ValidationCustomException("مبلغ برگشتی نمی‌تواند از مبلغ پرداخت‌شده بیشتر باشد.");

            return (ulong)net;
        }
    }
}
