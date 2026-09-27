using System.Linq.Expressions;
using Domain.Enums;

namespace Application.Common.Contracts.ProductUnit
{
    /// <summary>
    /// Which existing units of a product a movement may take: one status, optionally narrowed to a purchase, a purchase line
    /// and a custody reason. A null narrowing does not restrict. <paramref name="IncludeLineHolds"/> widens an ON_ORDER custody
    /// narrowing to the line's other paid-for held units - CUSTOMER_RETURN and WAREHOUSE_HOLD (see PurchaseReturnQuarantine).
    /// </summary>
    public sealed record UnitSelection(
        ProductUnitStatusEnum Status,
        int? PurchaseId = null,
        int? PurchaseItemId = null,
        UnitCustodyReasonEnum? CustodyReason = null,
        bool IncludeLineHolds = false)
    {
        /// <summary>Sellable stock, only from <paramref name="purchaseItemId"/> when given.</summary>
        public static UnitSelection InStock(int? purchaseItemId) => new(ProductUnitStatusEnum.IN_STOCK, PurchaseItemId: purchaseItemId);

        /// <summary>
        /// The one definition of which units of <paramref name="productId"/> this selection covers - used by the unit service to
        /// move them and by every count of what is held, so the two can never disagree.
        /// </summary>
        public Expression<Func<Domain.Entities.ProductUnit, bool>> ToFilter(int productId)
        {
            var status = Status;
            var purchaseId = PurchaseId;
            var purchaseItemId = PurchaseItemId;
            var custodyReason = CustodyReason;
            var lineHolds = IncludeLineHolds;

            return x => x.ProductId == productId
                && x.Status == status
                && (purchaseId == null || x.PurchaseId == purchaseId)
                && (purchaseItemId == null || x.PurchaseItemId == purchaseItemId)
                && (custodyReason == null || x.CustodyReason == custodyReason
                    || (lineHolds && (x.CustodyReason == UnitCustodyReasonEnum.CUSTOMER_RETURN || x.CustodyReason == UnitCustodyReasonEnum.WAREHOUSE_HOLD)));
        }
    }
}
