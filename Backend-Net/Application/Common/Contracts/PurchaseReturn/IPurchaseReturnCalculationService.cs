using Application.Common.Dtos.Returns;
using Application.Common.Enums;
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
        /// The lifecycle state machine, in one place. Returns the Persian reason the action is
        /// refused, or null when it is legal:
        /// <list type="table">
        /// <item><term>OPEN / IN_PROGRESS</term><description>Cancel, Reject, Delete - unless goods have
        /// physically moved (no way back) or a money effect is recorded (way back: remove that
        /// resolution first). Reopen - refused.</description></item>
        /// <item><term>SETTLED</term><description>everything refused.</description></item>
        /// <item><term>REJECTED</term><description>Reopen only; the others point at Reopen.</description></item>
        /// <item><term>CANCELLED</term><description>everything refused.</description></item>
        /// </list>
        /// Needs the full return graph loaded (see PurchaseReturnQueryExtensions.WithReturnGraph).
        /// </summary>
        string? GetLifecycleBlocker(Domain.Entities.PurchaseReturn purchaseReturn, ReturnLifecycleActionEnum action);

        /// <summary><see cref="GetLifecycleBlocker"/> == null - backs the detail DTO's Can* flags.</summary>
        bool CanPerform(Domain.Entities.PurchaseReturn purchaseReturn, ReturnLifecycleActionEnum action);

        /// <summary>
        /// Whether any goods effect has physically moved at least one unit (AppliedQuantity &gt; 0),
        /// whether or not the effect has completed. The same test RemoveClaimResolution applies.
        /// </summary>
        bool HasMovedGoods(Domain.Entities.PurchaseReturn purchaseReturn);

        /// <summary>
        /// Whether any money effect is recorded. Money effects are born APPLIED - they record a
        /// payment that has already happened - so there is no "pending money" state.
        /// </summary>
        bool HasRecordedMoney(Domain.Entities.PurchaseReturn purchaseReturn);

        /// <summary>
        /// open: no resolution has been registered against any claim yet.
        /// settled: every claimed unit has a resolution and no effect anywhere is still PENDING.
        /// in_progress: otherwise (partially decided, or a goods effect still awaiting a round).
        /// Reject/cancel are explicit actions and are never produced here. Requires the full
        /// Claims -&gt; Resolutions -&gt; Effects graph to be loaded (see PurchaseReturnQueryExtensions).
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
