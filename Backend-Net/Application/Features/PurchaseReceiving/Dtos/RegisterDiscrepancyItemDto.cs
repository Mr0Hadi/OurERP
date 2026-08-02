using Domain.Enums;

namespace Application.Features.PurchaseReceiving.Dtos
{
    public class RegisterDiscrepancyItemDto
    {
        public int PurchaseItemId { get; set; }
        public int Quantity { get; set; }
        public DiscrepancyTypeEnum DiscrepancyType { get; set; }
        public string? Reason { get; set; }
    }
}
