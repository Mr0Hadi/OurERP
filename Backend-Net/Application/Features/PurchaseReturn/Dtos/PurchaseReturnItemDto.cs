using Domain.Enums;

namespace Application.Features.PurchaseReturn.Dtos
{
    public class PurchaseReturnItemDto
    {
        public int Id { get; set; }
        public int PurchaseReturnId { get; set; }
        public int PurchaseItemId { get; set; }
        public int ProductId { get; set; }
        public string ProductCode { get; set; }
        public string ProductName { get; set; }
        public string Unit { get; set; }
        public int Quantity { get; set; }
        public UInt64 UnitPrice { get; set; }
        public PurchaseIssueTypeEnum IssueType { get; set; }
        public string? Note { get; set; }
        public List<PurchaseReturnDecisionDto> Decisions { get; set; }
    }
}
