using Domain.Enums;

namespace Domain.Entities
{
    /// <summary>
    /// One row of a customer's or supplier's account - what they owe us, or we owe them. Append-only: a row is never
    /// edited or deleted, a mistake is taken back by a REVERSAL row pointing at it. No IsActive. Written only by
    /// Application.Common.Ledger.PartyLedger, in the same SaveChanges as the document change it records.
    /// Separate from InventoryCostLedgerEntry, which values stock and books revenue at shipment; this one tracks money
    /// owed between us and a party.
    /// </summary>
    public class PartyLedgerEntry
    {
        public int Id { get; set; }

        /// <summary>Exactly one of CustomerId / SupplierId is set (check constraint).</summary>
        public int? CustomerId { get; set; }
        public Customer? Customer { get; set; }

        public int? SupplierId { get; set; }
        public Supplier? Supplier { get; set; }

        public PartyLedgerDirectionEnum Direction { get; set; }

        /// <summary>Always &gt; 0 (check constraint); the side is <see cref="Direction"/>.</summary>
        public UInt64 Amount { get; set; }

        public PartyLedgerEntryTypeEnum EntryType { get; set; }

        /// <summary>When it happened in business terms (invoice date, payment date); orders the statement.</summary>
        public DateTime OccurredAt { get; set; }

        public DateTime CreatedAt { get; set; }

        /// <summary>The sale or purchase the row belongs to, when there is one.</summary>
        public int? SaleId { get; set; }
        public Sale? Sale { get; set; }

        public int? PurchaseId { get; set; }
        public Purchase? Purchase { get; set; }

        /// <summary>The payment row a PAYMENT entry records.</summary>
        public int? PaymentDetailId { get; set; }
        public PaymentDetail? PaymentDetail { get; set; }

        /// <summary>
        /// The return claim a RETURN_SETTLEMENT row belongs to. Plain ids, deliberately not foreign keys: a return can be
        /// hard-deleted once its money is taken back, and the reversed rows must survive it.
        /// </summary>
        public int? SaleReturnClaimId { get; set; }
        public int? PurchaseReturnClaimId { get; set; }

        /// <summary>The purchase line a PURCHASE_SHORT_CLOSE row belongs to. A plain id, like the claim ids.</summary>
        public int? PurchaseItemId { get; set; }

        /// <summary>For a REVERSAL: the row it takes back.</summary>
        public int? ReversalOfEntryId { get; set; }
        public PartyLedgerEntry? ReversalOf { get; set; }

        /// <summary>Short Persian text for the statement, e.g. the invoice number.</summary>
        public string? Description { get; set; }
    }
}
