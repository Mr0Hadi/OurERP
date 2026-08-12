using System.ComponentModel.DataAnnotations.Schema;
using Domain.Enums;

namespace Domain.Entities
{
    // One row per (SaleReturnClaim, observed issue type) reported by the warehouse during
    // physical inspection. IssueType == null means the inspected quantity was healthy.
    public class SaleReturnItem
    {
        public int Id { get; set; }
        public int SaleReturnClaimId { get; set; }
        public SalesReturnIssueTypeEnum? IssueType { get; set; }
        public int Quantity { get; set; }
        public string? Note { get; set; }
        public DateTime CreatedAt { get; set; }
        public SaleReturnClaim? SaleReturnClaim { get; set; }
        public List<SaleReturnDecision> Decisions { get; set; } = new();

        // In-memory roll-ups over Decisions - see the note on SaleReturn.
        [NotMapped]
        public int DecidedQuantity => Decisions.Sum(d => d.Quantity);

        /// <summary>Inspected quantity on this line that still has no decision registered against it.</summary>
        [NotMapped]
        public int UndecidedQuantity => Quantity - DecidedQuantity;
    }
}
