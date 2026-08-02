using Domain.Enums;

namespace Domain.Entities
{
    public class DiscrepancyDecision
    {
        public int Id { get; set; }
        public DiscrepancyDecisionTypeEnum DecisionType { get; set; }
        public int Quantity { get; set; }
        public UInt64 UnitCost { get; set; }
        public string? Note { get; set; }
        public DateTime CreatedAt { get; set; }
        public ReceiptDiscrepancy Discrepancy { get; set; }
        public int DiscrepancyId { get; set; }
    }
}
