using Domain.Enums;

namespace Application.Common.Dtos.Returns
{
    /// <summary>
    /// One claim line posted when creating a return. Shared shape for both sides - OrderLineId is
    /// the PurchaseItemId or SaleItemId depending on which Create*ReturnCommand uses it.
    /// Required for ON_ORDER and for OFF_ORDER/EXCESS (its ProductId must match that line's, and an
    /// EXCESS claim's UnitPrice is taken from the line - the value sent here is not used); must be
    /// null for OFF_ORDER/UNLISTED (400 otherwise). An OFF_ORDER ProductId must exist (400 otherwise).
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
