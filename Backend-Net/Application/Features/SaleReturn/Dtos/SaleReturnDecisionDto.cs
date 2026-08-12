using Domain.Enums;

namespace Application.Features.SaleReturn.Dtos
{
    public class SaleReturnDecisionDto
    {
        public int Id { get; set; }
        public int SaleReturnItemId { get; set; }
        public SaleReturnDecisionTypeEnum DecisionType { get; set; }
        public int Quantity { get; set; }
        public UInt64? RefundAmount { get; set; }
        public SaleReturnDecisionStatusEnum Status { get; set; }
        public int ReplacementShippedQuantity { get; set; }
        public string? Note { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ResolvedAt { get; set; }
    }
}
