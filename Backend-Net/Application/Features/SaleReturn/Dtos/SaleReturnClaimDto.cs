using Domain.Enums;

namespace Application.Features.SaleReturn.Dtos
{
    public class SaleReturnClaimDto
    {
        public int Id { get; set; }
        public int SaleReturnId { get; set; }
        public int SaleItemId { get; set; }
        public int ProductId { get; set; }
        public string ProductCode { get; set; }
        public string ProductName { get; set; }
        public string Unit { get; set; }
        public UInt64 UnitPrice { get; set; }
        public SalesReturnReasonEnum Reason { get; set; }
        public int ClaimedQuantity { get; set; }
        public int InspectedQuantity { get; set; }
        public int UninspectedQuantity { get; set; }
        public UInt64 LineTotal { get; set; }
        public string? Note { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<SaleReturnItemDto> InspectionItems { get; set; } = new();
    }
}
