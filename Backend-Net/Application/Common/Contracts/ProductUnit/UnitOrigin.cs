using Domain.Enums;

namespace Application.Common.Contracts.ProductUnit
{
    /// <summary>
    /// Where newly minted units come from and what state they are born in. Status is IN_STOCK (sellable, counted in
    /// Product.Stock) or QUARANTINED (held, not counted); nothing else can be minted. A QUARANTINED origin must state
    /// <see cref="QuarantineCost"/>, the per-unit value the units carry off-pool (0 is a value: goods nobody paid for).
    /// </summary>
    public sealed record UnitOrigin(
        int? PurchaseId = null,
        int? PurchaseItemId = null,
        UnitCustodyReasonEnum? CustodyReason = null,
        ProductUnitStatusEnum Status = ProductUnitStatusEnum.IN_STOCK,
        decimal? QuarantineCost = null)
    {
        /// <summary>Units held in quarantine at <paramref name="quarantineCost"/> each.</summary>
        public static UnitOrigin Quarantined(int? purchaseId, int? purchaseItemId, UnitCustodyReasonEnum? custodyReason, decimal quarantineCost) =>
            new(purchaseId, purchaseItemId, custodyReason, ProductUnitStatusEnum.QUARANTINED, quarantineCost);

        /// <summary>No purchase behind the units: opening balance, manual adjustment, goods back from a customer with no sale line.</summary>
        public static UnitOrigin None { get; } = new();
    }
}
