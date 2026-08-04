using Domain.Enums;

namespace Domain.Entities
{
    public class PurchaseReturnDecision
    {
        public int Id { get; set; }
        public PurchaseReturnDecisionTypeEnum DecisionType { get; set; }
        public int Quantity { get; set; }
        public UInt64? RefundAmount { get; set; }
        public PurchaseReturnDecisionStatusEnum Status { get; set; }
        public string? Note { get; set; }
        public DateTime CreatedAt { get; set; }
        public PurchaseReturnItem PurchaseReturnItem { get; set; }
        public int PurchaseReturnItemId { get; set; }
    }
}
