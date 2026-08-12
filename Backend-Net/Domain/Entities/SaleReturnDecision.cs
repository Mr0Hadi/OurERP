using System.ComponentModel.DataAnnotations.Schema;
using Domain.Enums;

namespace Domain.Entities
{
    public class SaleReturnDecision
    {
        public int Id { get; set; }
        public int SaleReturnItemId { get; set; }
        public SaleReturnDecisionTypeEnum DecisionType { get; set; }
        public int Quantity { get; set; }
        public UInt64? RefundAmount { get; set; }
        public SaleReturnDecisionStatusEnum Status { get; set; }
        // Only meaningful for DecisionType == REPLACEMENT: cumulative quantity actually shipped
        // to the customer so far against this decision (ConfirmReplacementShipmentCommand).
        public int ReplacementShippedQuantity { get; set; }
        public string? Note { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public SaleReturnItem? SaleReturnItem { get; set; }

        /// <summary>Only meaningful for REPLACEMENT: quantity still owed to the customer.</summary>
        [NotMapped]
        public int UnshippedReplacementQuantity => Quantity - ReplacementShippedQuantity;
    }
}
