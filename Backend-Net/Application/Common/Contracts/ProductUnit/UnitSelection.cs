using Domain.Enums;

namespace Application.Common.Contracts.ProductUnit
{
    /// <summary>
    /// Which existing units of a product a movement may take: one status, optionally narrowed to a purchase, a purchase line
    /// and a custody reason. A null narrowing does not restrict.
    /// </summary>
    public sealed record UnitSelection(
        ProductUnitStatusEnum Status,
        int? PurchaseId = null,
        int? PurchaseItemId = null,
        UnitCustodyReasonEnum? CustodyReason = null)
    {
        /// <summary>Sellable stock, only from <paramref name="purchaseItemId"/> when given.</summary>
        public static UnitSelection InStock(int? purchaseItemId) => new(ProductUnitStatusEnum.IN_STOCK, PurchaseItemId: purchaseItemId);
    }
}
