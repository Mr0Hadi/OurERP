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
        /// Rows in the document's own direction minus rows the other way (refunds), voided rows excluded, plus the active
        /// allocations of on-account payments to it. Throws when refunds would exceed what was paid - that is the one state
        /// the rows are never allowed to reach. Callers load both collections (Include PaymentDetails and PaymentAllocations).
        /// </summary>
        public static ulong NetPaid(IEnumerable<PaymentDetail> payments, IEnumerable<PaymentAllocation> allocations, PaymentDirectionEnum documentDirection)
        {
            var net = 0m;
            foreach (var payment in payments.Where(p => p.VoidedAt == null))
                net += payment.Direction == documentDirection ? payment.Amount : -payment.Amount;
            foreach (var allocation in allocations.Where(a => a.VoidedAt == null))
                net += allocation.Amount;

            if (net < 0)
                throw new ValidationCustomException("مبلغ برگشتی نمی‌تواند از مبلغ پرداخت‌شده بیشتر باشد.");

            return (ulong)net;
        }

        /// <summary>What is still unapplied of an on-account payment: its amount minus its active allocations.</summary>
        public static ulong Unallocated(PaymentDetail payment) =>
            (ulong)payment.Amount - payment.Allocations.Where(a => a.VoidedAt == null).Aggregate(0UL, (sum, a) => sum + a.Amount);

        /// <summary>
        /// Takes back every active allocation on a document that is being cancelled or deleted: the on-account money goes
        /// back to being unallocated, free for another invoice. Nothing else moves - the party's balance already counts it.
        /// </summary>
        public static int ReleaseAllocations(IEnumerable<PaymentAllocation> allocations)
        {
            var released = 0;
            foreach (var allocation in allocations.Where(a => a.VoidedAt == null))
            {
                allocation.VoidedAt = DateTime.Now;
                released++;
            }
            return released;
        }
    }
}
