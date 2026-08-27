using Domain.Enums;

namespace Application.Common.Contracts.SaleReturn
{
    /// <summary>
    /// Shared math/status rules for the sale-return effects model. Mirrors
    /// IPurchaseReturnCalculationService's role and, with the effects model, its structure too - the
    /// only remaining asymmetry from purchase returns is which document status field each side's
    /// RecomputeXStatus writes back to.
    /// </summary>
    public interface ISaleReturnCalculationService
    {
        bool IsTerminal(ReturnStatusEnum status);

        /// <summary>
        /// Whether no effect anywhere on the return has ever reached APPLIED - the guard for
        /// cancel/reject/delete (matches the frontend's isReturnUntouched).
        /// </summary>
        bool IsUntouched(Domain.Entities.SaleReturn saleReturn);

        /// <summary>
        /// open: no resolution has been registered against any claim yet.
        /// settled: every claimed unit has a resolution and no effect anywhere is still PENDING.
        /// in_progress: otherwise (partially decided, or a goods effect still awaiting a round).
        /// Reject/cancel are explicit actions and are never produced here. Requires the full
        /// Claims -&gt; Resolutions -&gt; Effects graph to be loaded (see ISaleReturnQueryService).
        /// </summary>
        ReturnStatusEnum RecomputeReturnStatus(Domain.Entities.SaleReturn saleReturn);

        /// <summary>
        /// How much of a sale item's on-order claimed quantity is currently claimed but not yet
        /// resolved, summed across every active (non-terminal) return for that sale item. Off-order
        /// claims (Scope == OFF_ORDER) never consume a line's quota.
        /// </summary>
        int GetOpenClaimQuantity(int saleItemId, List<Domain.Entities.SaleReturn> activeReturns);

        /// <summary>
        /// How much of a sale item's shipped quantity is still eligible for a brand-new on-order
        /// claim: shipped minus what's already been settled, minus whatever is currently
        /// claimed-but-undecided across active returns.
        /// </summary>
        int GetClaimableQuantity(Domain.Entities.SaleItem item, List<Domain.Entities.SaleReturn> activeReturns);

        /// <summary>
        /// Sale.Status is only ever overridden by return activity to flip to RETURNED once every
        /// unit ever shipped has been settled through a return resolution whose goods effects (if
        /// any) have all completed. Otherwise the sale's own status is untouched.
        /// </summary>
        SalesStatusEnum RecomputeSaleStatus(Domain.Entities.Sale sale);

        /// <summary>
        /// Expands a composition (the same {quantity, goodsIn, goodsOut, money} shape the frontend
        /// posts) into the Effect rows it represents. Goods effects start PENDING; money effects
        /// start APPLIED immediately since there is nothing further to execute.
        /// </summary>
        List<Domain.Entities.SaleReturnEffect> ExpandComposition(Application.Common.Dtos.Returns.EffectCompositionDto composition, DateTime now);
    }
}
