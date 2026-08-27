using Domain.Enums;

namespace Application.Features.PurchaseReturn.Dtos
{
    public class PurchaseReturnClaimDto
    {
        public int Id { get; set; }
        public int PurchaseReturnId { get; set; }
        public ReturnClaimScopeEnum Scope { get; set; }
        public ReturnOffScopeKindEnum? OffScopeKind { get; set; }
        public int? PurchaseItemId { get; set; }
        public int ProductId { get; set; }
        public string ProductCode { get; set; }
        public string ProductName { get; set; }
        public string Unit { get; set; }
        public UInt64 UnitPrice { get; set; }
        public int Quantity { get; set; }
        public ReturnProblemEnum Problem { get; set; }
        public string? Note { get; set; }
        public DateTime CreatedAt { get; set; }
        public int DecidedQuantity { get; set; }
        public int RemainingQuantity { get; set; }
        public List<PurchaseReturnResolutionDto> Resolutions { get; set; } = new();
    }
}
