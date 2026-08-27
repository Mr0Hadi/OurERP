using Application.Common.Dtos.Returns;
using Domain.Enums;

namespace Application.Common.Contracts.PurchaseReturn
{
    /// <summary>
    /// Shared math/status rules for the purchase-return effects model. Kept in one place so
    /// CreatePurchaseReturn, claim-resolution add/remove, goods-round execution, and the return
    /// lifecycle commands (cancel/reject/reopen/delete) never disagree on the same numbers.
    /// </summary>
    public interface IPurchaseReturnCalculationService
    {
        bool IsTerminal(ReturnStatusEnum status);

        /// <summary>
        /// Whether no effect anywhere on the return has ever reached APPLIED - the guard for
        /// cancel/reject/delete (matches the frontend's isReturnUntouched).
        /// </summary>
        bool IsUntouched(Domain.Entities.PurchaseReturn purchaseReturn);

        /// <summary>
        /// open: no resolution has been registered against any claim yet.
        /// settled: every claimed unit has a resolution and no effect anywhere is still PENDING.
        /// in_progress: otherwise (partially decided, or a goods effect still awaiting a round).
        /// Reject/cancel are explicit actions and are never produced here. Requires the full
        /// Claims -&gt; Resolutions -&gt; Effects graph to be loaded (see IPurchaseReturnQueryService).
        /// </summary>
        ReturnStatusEnum RecomputeReturnStatus(Domain.Entities.PurchaseReturn purchaseReturn);

        /// <summary>
        /// How much of a purchase item's on-order claimed quantity is currently claimed but not
        /// yet resolved, summed across every active (non-terminal) return for that purchase item.
        /// Off-order claims (Scope == OFF_ORDER) never consume a line's quota.
        /// </summary>
        int GetOpenClaimQuantity(int purchaseItemId, List<Domain.Entities.PurchaseReturn> activeReturns);

        /// <summary>
        /// How much of a purchase item's received quantity is still eligible for a brand-new
        /// on-order claim: received minus what's already been settled, minus whatever is
        /// currently claimed-but-undecided across active returns.
        /// </summary>
        int GetClaimableQuantity(Domain.Entities.PurchaseItem item, List<Domain.Entities.PurchaseReturn> activeReturns);

        /// <summary>
        /// Purchase.Status is only ever overridden by return activity to flip back to RECEIVED
        /// once every unit ever received has been settled through a return resolution whose goods
        /// effects (if any) have all completed. Otherwise the purchase's own status is untouched.
        /// </summary>
        PurchaseStatusEnum RecomputePurchaseStatus(Domain.Entities.Purchase purchase);

        /// <summary>
        /// Expands a composition (the same {quantity, goodsIn, goodsOut, money} shape the frontend
        /// posts) into the Effect rows it represents. Goods effects start PENDING; money effects
        /// start APPLIED immediately since there is nothing further to execute.
        /// </summary>
        List<Domain.Entities.PurchaseReturnEffect> ExpandComposition(EffectCompositionDto composition, DateTime now);
    }
}
