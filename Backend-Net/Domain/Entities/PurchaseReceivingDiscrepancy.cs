using Domain.Enums;

namespace Domain.Entities
{
    /// <summary>
    /// What a receiving round found that was not a clean, owed, healthy unit: defective units on the line, excess over it, or a
    /// product the purchase does not list - by problem, with the warehouse's note. Describes the round, not specific units:
    /// quarantined units are fungible, and a problem pinned to a unit would make a later movement pick which problems remain.
    ///
    /// Append-only, keyed on the purchase, no IsActive - same shape as PurchaseReceivingImage/PurchaseDriver/PurchaseReceivingNote.
    /// For prefilling the discrepancy form and for the audit trail only: claim quotas are never read from here, they come from
    /// ProductUnit.CustodyReason alone, so one quantity has one source.
    /// </summary>
    public class PurchaseReceivingDiscrepancy
    {
        public int Id { get; set; }
        public int PurchaseId { get; set; }

        /// <summary>The line for ON_ORDER and EXCESS; null for UNLISTED.</summary>
        public int? PurchaseItemId { get; set; }
        public int ProductId { get; set; }
        public UnitCustodyReasonEnum CustodyReason { get; set; }
        public ReturnProblemEnum Problem { get; set; }
        public int Quantity { get; set; }
        public string? Note { get; set; }

        /// <summary>The receiving round's date.</summary>
        public DateTime ReceivedAt { get; set; }
        public DateTime CreatedAt { get; set; }

        public Purchase? Purchase { get; set; }
        public Product? Product { get; set; }
    }
}
