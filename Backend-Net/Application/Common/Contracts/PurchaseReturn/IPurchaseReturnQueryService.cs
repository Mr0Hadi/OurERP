namespace Application.Common.Contracts.PurchaseReturn
{
    /// <summary>
    /// The Include spines and the "active" definition every PurchaseReturn handler needs, in one
    /// place - mirrors ISaleReturnQueryService now that both sides allow several concurrent active
    /// returns per document (purchase returns are created explicitly, same as sale returns, so the
    /// old "at most one active return" constraint that came from ReceivePurchase auto-creating one
    /// no longer applies).
    ///
    /// <see cref="Application.Common.Contracts.PurchaseReturn.IPurchaseReturnCalculationService.RecomputeReturnStatus"/>
    /// and the PurchaseReturn/PurchaseReturnClaim roll-up properties all sum over the loaded graph,
    /// so a handler that forgets a ThenInclude does not fail - it silently computes a status from
    /// empty collections and persists it. Any handler that recomputes a status must load
    /// <see cref="WithReturnGraph"/>.
    /// </summary>
    public interface IPurchaseReturnQueryService
    {
        /// <summary>Returns still reserving quantity against their purchase items.</summary>
        IQueryable<Domain.Entities.PurchaseReturn> WhereActive(IQueryable<Domain.Entities.PurchaseReturn> query);

        /// <summary>
        /// Claims -&gt; (Product, Resolutions -&gt; Effects -&gt; (History -&gt; Observations, MoneyParts)):
        /// everything the return's own math and detail views read. <paramref name="includePurchaseItems"/>
        /// adds Purchase -&gt; Items, which only handlers that settle quantity against the purchase need.
        /// </summary>
        IQueryable<Domain.Entities.PurchaseReturn> WithReturnGraph(IQueryable<Domain.Entities.PurchaseReturn> query, bool includePurchaseItems = false);

        /// <summary><see cref="WhereActive"/> + <see cref="WithReturnGraph"/>, for the callers that arbitrate across a purchase's live returns.</summary>
        IQueryable<Domain.Entities.PurchaseReturn> ActiveWithReturnGraph(IQueryable<Domain.Entities.PurchaseReturn> query);
    }
}
