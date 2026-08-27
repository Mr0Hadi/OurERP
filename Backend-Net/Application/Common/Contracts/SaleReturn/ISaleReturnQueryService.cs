namespace Application.Common.Contracts.SaleReturn
{
    /// <summary>
    /// The Include spines and the "active" definition every SaleReturn handler needs, in one place.
    ///
    /// This is not just noise-removal: <see cref="ISaleReturnCalculationService.RecomputeReturnStatus"/>
    /// and the SaleReturn/SaleReturnClaim roll-up properties all sum over the loaded graph, so a
    /// handler that forgets a ThenInclude does not fail - it silently computes a status from empty
    /// collections and persists it. Any handler that recomputes a status must load
    /// <see cref="WithReturnGraph"/>.
    ///
    /// Every method takes and returns an <see cref="IQueryable{T}"/> so callers can still compose
    /// their own Where/Include around it.
    /// </summary>
    public interface ISaleReturnQueryService
    {
        /// <summary>
        /// Returns still reserving quantity against their sale items. A sale can have several at
        /// once, which is what <see cref="ISaleReturnCalculationService.GetOpenClaimQuantity"/>
        /// arbitrates between. Shared with <c>ISaleReturnRepository.GetActiveBySaleIdAsync</c> so
        /// there is one definition of "active".
        /// </summary>
        IQueryable<Domain.Entities.SaleReturn> WhereActive(IQueryable<Domain.Entities.SaleReturn> query);

        /// <summary>
        /// Claims -&gt; (Product, Resolutions -&gt; Effects -&gt; (History -&gt; Observations, MoneyParts)):
        /// everything the return's own math and detail views read. <paramref name="includeSaleItems"/>
        /// adds Sale -&gt; Items, which only handlers that settle quantity against the sale need.
        /// </summary>
        IQueryable<Domain.Entities.SaleReturn> WithReturnGraph(IQueryable<Domain.Entities.SaleReturn> query, bool includeSaleItems = false);

        /// <summary><see cref="WhereActive"/> + <see cref="WithReturnGraph"/>, for the callers that
        /// arbitrate across a sale's live returns.</summary>
        IQueryable<Domain.Entities.SaleReturn> ActiveWithReturnGraph(IQueryable<Domain.Entities.SaleReturn> query);
    }
}
