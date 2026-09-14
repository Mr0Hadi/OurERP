using Domain.Enums;

namespace Application.Common.Contracts.ProductUnit
{
    /// <summary>
    /// Where newly minted units come from and what state they are born in. Status is IN_STOCK (sellable, counted in
    /// Product.Stock) or QUARANTINED (held, not counted); nothing else can be minted.
    /// </summary>
    public sealed record UnitOrigin(
        int? PurchaseId = null,
        int? PurchaseItemId = null,
        UnitCustodyReasonEnum? CustodyReason = null,
        ProductUnitStatusEnum Status = ProductUnitStatusEnum.IN_STOCK)
    {
        /// <summary>No purchase behind the units: opening balance, manual adjustment, goods back from a customer with no sale line.</summary>
        public static UnitOrigin None { get; } = new();
    }
}
