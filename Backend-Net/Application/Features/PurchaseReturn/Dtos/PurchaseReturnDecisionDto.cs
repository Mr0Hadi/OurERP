using Domain.Enums;

namespace Application.Features.PurchaseReturn.Dtos
{
    public class PurchaseReturnDecisionDto
    {
        public int Id { get; set; }
        public int PurchaseReturnItemId { get; set; }
        public PurchaseReturnDecisionTypeEnum DecisionType { get; set; }
        public int Quantity { get; set; }
        public UInt64 RefundAmount { get; set; }
        public PurchaseReturnDecisionStatusEnum Status { get; set; }
        public string? Note { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
