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
    /// </summary>
    public static class PurchaseReturnQuarantine
    {
        public static UnitSelection For(Domain.Entities.PurchaseReturnClaim claim, bool sameProduct, int purchaseId)
        {
            if (sameProduct && claim.Scope == ReturnClaimScopeEnum.ON_ORDER)
                return new(ProductUnitStatusEnum.QUARANTINED, purchaseId, claim.PurchaseItemId, UnitCustodyReasonEnum.ON_ORDER);

            if (sameProduct && claim.OffScopeKind == ReturnOffScopeKindEnum.EXCESS)
                return new(ProductUnitStatusEnum.QUARANTINED, purchaseId, claim.PurchaseItemId, UnitCustodyReasonEnum.EXCESS);

            return new(ProductUnitStatusEnum.QUARANTINED, purchaseId, null, UnitCustodyReasonEnum.UNLISTED);
        }
    }
}
