using Domain.Enums;

namespace Application.Common.Contracts.SaleReturn
{
    /// <summary>
    /// Shared math/status rules for the sale-return flow. Mirrors IPurchaseReturnCalculationService's
    /// role (one place for the numbers so CreateSaleReturn, ConfirmReturnInspection, decision add/
    /// remove and the return lifecycle commands never disagree), adjusted for two structural
    /// differences from purchase returns: (1) a sale can have several concurrent active returns
    /// instead of at most one, so quantity math sums across a list, not a single nullable; (2) the
    /// return only leaves PENDING_INSPECTION once every claimed unit has been physically inspected,
    /// not on the first decision.
    /// </summary>
    public interface ISaleReturnCalculationService
    {
        bool IsTerminal(SaleReturnStatusEnum status);

        /// <summary>
        /// Whether the return still accepts inspection results and decisions - i.e. it is neither
        /// finished (RESOLVED) nor terminal (REJECTED/CANCELLED).
        /// </summary>
        bool IsMutable(Domain.Entities.SaleReturn saleReturn);

        /// <summary>
        /// Whether nothing has physically been inspected yet. Cancel/reject/delete are only legal
        /// in this state (stricter than PurchaseReturn's pre-decision rule, because a sale return
        /// can sit in PENDING_INSPECTION for a while before the goods actually turn up).
        /// </summary>
        bool IsPreInspection(Domain.Entities.SaleReturn saleReturn);

        /// <summary>
        /// REPLACEMENT makes no sense for a healthy (issueType == null) inspected quantity - there's
        /// nothing to replace. Every other combination of decision and issue type (including null) is
        /// allowed.
        /// </summary>
        bool IsValidDecision(SalesReturnIssueTypeEnum? issueType, SaleReturnDecisionTypeEnum decisionType);

        /// <summary>
        /// pending_inspection: not every claimed unit has been physically inspected yet.
        /// coordinating: fully inspected, but at least one inspected unit has no final decision yet
        /// (or a decision line - a replacement - is still awaiting shipment).
        /// resolved: every inspected unit has a final decision.
        /// Reject/cancel are explicit actions and are never produced here.
        /// </summary>
        SaleReturnStatusEnum RecomputeReturnStatus(Domain.Entities.SaleReturn saleReturn);

        /// <summary>
        /// How much of a sale item's claimed-but-not-yet-decided quantity is currently open,
        /// summed across every active (non-terminal) return for that sale item.
        /// </summary>
        int GetOpenClaimQuantity(int saleItemId, List<Domain.Entities.SaleReturn> activeReturns);

        /// <summary>
        /// How much of a sale item's shipped quantity is still eligible for a brand-new claim:
        /// shipped minus what's already been financially settled (refund/store-credit/no-comp),
        /// minus whatever is currently claimed-but-undecided across active returns.
        /// </summary>
        int GetClaimableQuantity(Domain.Entities.SaleItem item, List<Domain.Entities.SaleReturn> activeReturns);

        /// <summary>
        /// Sale.Status is only ever overridden by return activity to flip to RETURNED, once every
        /// unit ever shipped for the sale has been financially settled through a return decision.
        /// Otherwise the sale's own status (as set by shipping/manual delivery) is left untouched.
        /// </summary>
        SalesStatusEnum RecomputeSaleStatus(Domain.Entities.Sale sale);
    }
}
