using Domain.Enums;

namespace Application.Features.SaleReturn.Dtos
{
    public class SaleReturnItemDto
    {
        public int Id { get; set; }
        public int SaleReturnClaimId { get; set; }
        public SalesReturnIssueTypeEnum? IssueType { get; set; }
        public int Quantity { get; set; }
        public int AllocatedQuantity { get; set; }
        public int RemainingQuantity { get; set; }
        public string? Note { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<SaleReturnDecisionDto> Decisions { get; set; } = new();
    }
}
