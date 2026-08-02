using Domain.Enums;

namespace Application.Features.PurchaseReceiving.Dtos
{
    public class DecideDiscrepancyItemDto
    {
        public int DiscrepancyId { get; set; }
        public DiscrepancyDecisionTypeEnum DecisionType { get; set; }
        public int Quantity { get; set; }
        public UInt64 UnitCost { get; set; }
        public string? Note { get; set; }
    }
}
