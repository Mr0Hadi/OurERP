using Domain.Enums;

namespace Application.Features.PurchaseReceiving.Dtos
{
    public class ReceiptDiscrepancyDto
    {
        public int Id { get; set; }
        public int PurchaseReceiptId { get; set; }
        public int PurchaseReceiptItemId { get; set; }
        public int Quantity { get; set; }
        public DiscrepancyTypeEnum DiscrepancyType { get; set; }
        public string? Reason { get; set; }
        public DiscrepancyStatusEnum Status { get; set; }
        public List<DiscrepancyDecisionDto> Decisions { get; set; }
    }
}
