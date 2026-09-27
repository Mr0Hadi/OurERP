using Application.Common.Contracts.ProductUnit;
using Domain.Enums;

namespace Application.Common.Returns
{
    /// <summary>
    /// Which quarantined units a purchase-return claim works on, and the custody a damaged replacement is held under - the same
    /// fact the off-order claim quota counts (UnitCustodyReasonEnum): an ON_ORDER claim works its line's defective units, an
    /// EXCESS claim its line's excess, an UNLISTED claim that product's unlisted units on this purchase. Goods of a different
    /// product than the claim's are held and taken as UNLISTED. Shared by the decision (is there enough in quarantine?) and the
    /// goods round (take these units), so the two can never disagree about which units a claim may touch.
    ///
    /// An ON_ORDER claim also takes its line's CUSTOMER_RETURN units (defective goods of that line a customer brought back) and
    /// WAREHOUSE_HOLD units (taken off the shelf by the warehouse). They were bought on this line exactly like the defects found
    /// at receiving, so a claim against the supplier covers all three. Units minted for a damaged replacement are still held as
    /// ON_ORDER (<see cref="UnitSelection.CustodyReason"/>).
    /// </summary>
    public static class PurchaseReturnQuarantine
    {
        public static UnitSelection For(Domain.Entities.PurchaseReturnClaim claim, bool sameProduct, int purchaseId)
        {
            if (sameProduct && claim.Scope == ReturnClaimScopeEnum.ON_ORDER)
                return new(ProductUnitStatusEnum.QUARANTINED, purchaseId, claim.PurchaseItemId, UnitCustodyReasonEnum.ON_ORDER, IncludeLineHolds: true);

            if (sameProduct && claim.OffScopeKind == ReturnOffScopeKindEnum.EXCESS)
                return new(ProductUnitStatusEnum.QUARANTINED, purchaseId, claim.PurchaseItemId, UnitCustodyReasonEnum.EXCESS);

            return new(ProductUnitStatusEnum.QUARANTINED, purchaseId, null, UnitCustodyReasonEnum.UNLISTED);
        }

        /// <summary>
        /// Whether <paramref name="claim"/> itself reserves this selection's units: an EXCESS or UNLISTED claim does, from the moment it
        /// is created (its quota), so the effects decided under it draw on that reservation and must not be counted again.
        /// </summary>
        public static bool IsReservedByClaim(Domain.Entities.PurchaseReturnClaim claim, bool sameProduct) =>
            sameProduct && claim.Scope == ReturnClaimScopeEnum.OFF_ORDER;
    }
}
