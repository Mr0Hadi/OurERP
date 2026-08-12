using Domain.Enums;

namespace Application.Common.Contracts.PurchaseReturn
{
    /// <summary>
    /// Shared math/status rules for the purchase-return flow. Kept in one place because
    /// ReceivePurchase, decision add/remove, and the return lifecycle commands (cancel/
    /// reject/reopen) all need to agree on the same numbers.
    /// </summary>
    public interface IPurchaseReturnCalculationService
    {
        bool IsTerminal(PurchaseReturnStatusEnum status);

        bool IsValidDecision(PurchaseIssueTypeEnum issueType, PurchaseReturnDecisionTypeEnum decisionType);

        /// <summary>
        /// pending: no decision registered on any item yet.
        /// coordinating: some quantity decided but at least one decision line (a replacement)
        /// is still awaiting physical fulfillment, or some quantity is still undecided.
        /// resolved: every unit of every item has a decision, and every decision is final.
        /// Reject/cancel are explicit actions and are never produced here.
        /// </summary>
        PurchaseReturnStatusEnum RecomputeReturnStatus(Domain.Entities.PurchaseReturn purchaseReturn);

        /// <summary>
        /// How much of a purchase item's reported-issue quantity, within the given active
        /// return, still has no decision registered against it.
        /// </summary>
        int GetOpenIssueQuantity(int purchaseItemId, Domain.Entities.PurchaseReturn? activeReturn);

        /// <summary>
        /// How much of a purchase item's ordered quantity can still legitimately arrive in a
        /// future receiving round: ordered minus what's already physically received, minus
        /// what's already been financially settled (refund/credit/write-off), minus whatever
        /// is currently a reported-but-undecided issue.
        /// </summary>
        int GetReceivableQuantity(Domain.Entities.PurchaseItem item, Domain.Entities.PurchaseReturn? activeReturn);

        PurchaseStatusEnum RecomputePurchaseStatus(Domain.Entities.Purchase purchase, Domain.Entities.PurchaseReturn? activeReturn);

        /// <summary>
        /// After a receiving round updates ReceivedQuantity, some of that freshly-arrived
        /// stock may actually be the physical fulfillment of a REPLACEMENT decision made
        /// earlier (rather than the purchase's normal remaining shipment). We can't tell the
        /// two apart directly, so: for each purchase item with AWAITING replacement decisions,
        /// if the total awaiting quantity now exceeds what the purchase would still normally
        /// owe, the surplus must be the replacement having arrived - resolve the oldest
        /// AWAITING lines first (FIFO) up to that surplus.
        /// </summary>
        void ResolveAwaitingReplacements(Domain.Entities.Purchase purchase, Domain.Entities.PurchaseReturn? activeReturn, DateTime now);
    }
}
