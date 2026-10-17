namespace Domain.Entities
{
    /// <summary>
    /// Part of an on-account payment (a PaymentDetail with a CustomerId or SupplierId and no document) applied to a sale or
    /// purchase. Bookkeeping only: no money moves and no party-ledger row is written - the payment itself already moved the
    /// money and the party's balance. What it changes is the document's PaidAmount (DocumentPayments.NetPaid counts active
    /// allocations) and how much of the payment is still unallocated. Exactly one of SaleId / PurchaseId is set.
    /// Never edited or deleted: removing one stamps VoidedAt.
    /// </summary>
    public class PaymentAllocation
    {
        public int Id { get; set; }

        public int PaymentDetailId { get; set; }
        public PaymentDetail PaymentDetail { get; set; } = null!;

        public int? SaleId { get; set; }
        public Sale? Sale { get; set; }

        public int? PurchaseId { get; set; }
        public Purchase? Purchase { get; set; }

        public UInt64 Amount { get; set; }
        public DateTime AllocatedAt { get; set; }
        public int? AllocatedByUserId { get; set; }

        /// <summary>Set when the allocation is taken back (by hand, or because the document was cancelled or deleted).</summary>
        public DateTime? VoidedAt { get; set; }
    }
}
