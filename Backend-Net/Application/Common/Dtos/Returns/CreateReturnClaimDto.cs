using Domain.Enums;

namespace Application.Common.Dtos.Returns
{
    /// <summary>
    /// One claim line posted when creating a return. Shared shape for both sides - OrderLineId is
    /// the PurchaseItemId or SaleItemId depending on which Create*ReturnCommand uses it, null when
    /// Scope == OFF_ORDER.
    /// </summary>
    public class CreateReturnClaimDto
    {
        public ReturnClaimScopeEnum Scope { get; set; }
        public ReturnOffScopeKindEnum? OffScopeKind { get; set; }
        public int? OrderLineId { get; set; }
        public int ProductId { get; set; }
        public ulong UnitPrice { get; set; }
        public int Quantity { get; set; }
        public ReturnProblemEnum Problem { get; set; }
        public string? Note { get; set; }
    }
}
