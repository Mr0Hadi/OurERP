using Domain.Enums;
using Microsoft.EntityFrameworkCore;
using PurchaseReturn = Domain.Entities.PurchaseReturn;

namespace Application.Common.Queries;

/// <summary>
/// The soft-delete filter, the "open" definition and the Include spines every PurchaseReturn
/// handler needs, in one place - mirrors <see cref="SaleReturnQueryExtensions"/>.
///
/// Composition, not a service: these are stateless <see cref="IQueryable{T}"/> transformations with
/// no dependencies, so there is nothing to inject and nothing worth mocking.
///
/// <see cref="Application.Common.Contracts.PurchaseReturn.IPurchaseReturnCalculationService.RecomputeReturnStatus"/>
/// and the PurchaseReturn/PurchaseReturnClaim roll-up properties all sum over the loaded graph, so a
/// handler that forgets a ThenInclude does not fail - it silently computes a status from empty
/// collections and persists it. Any handler that recomputes a status must compose
/// <see cref="WithReturnGraph"/>.
/// </summary>
public static class PurchaseReturnQueryExtensions
{
    /// <summary>Returns still reserving quantity against their purchase items.</summary>
    private static readonly ReturnStatusEnum[] OpenStatuses = [ReturnStatusEnum.OPEN, ReturnStatusEnum.IN_PROGRESS];

    /// <summary>
    /// Drops soft-deleted returns (IsActive = false). Delete is a soft delete, and this project
    /// deliberately has no global query filter (see CLAUDE.md section 7), so every read of
    /// PurchaseReturns must compose this explicitly.
    /// </summary>
    public static IQueryable<PurchaseReturn> WhereNotDeleted(this IQueryable<PurchaseReturn> query) =>
        query.Where(x => x.IsActive);

    /// <summary>
    /// Status filter only - deliberately says nothing about soft delete, so that "open" and
    /// "not deleted" stay two separate, separately named questions. Callers that want live returns
    /// compose both: <c>.WhereNotDeleted().WhereOpen()</c>.
    /// </summary>
    public static IQueryable<PurchaseReturn> WhereOpen(this IQueryable<PurchaseReturn> query) =>
        query.Where(x => OpenStatuses.Contains(x.Status));

    /// <summary>
    /// Claims -&gt; (Product, Resolutions -&gt; Effects -&gt; (History -&gt; Observations, MoneyParts, Product)):
    /// everything the return's own math and detail views read. Split into one query per collection,
    /// since loading four nested collections in a single JOIN multiplies the row count at every level.
    /// </summary>
    public static IQueryable<PurchaseReturn> WithReturnGraph(this IQueryable<PurchaseReturn> query) =>
        query
            .Include(x => x.Claims).ThenInclude(c => c.Product)
            .Include(x => x.Claims).ThenInclude(c => c.Resolutions).ThenInclude(r => r.Effects)
                .ThenInclude(e => e.History).ThenInclude(h => h.Observations)
            .Include(x => x.Claims).ThenInclude(c => c.Resolutions).ThenInclude(r => r.Effects)
                .ThenInclude(e => e.MoneyParts)
            // An effect's product can differ from its claim's (a replacement), so the read side
            // needs its own Product to name it rather than borrowing the claim's.
            .Include(x => x.Claims).ThenInclude(c => c.Resolutions).ThenInclude(r => r.Effects)
                .ThenInclude(e => e.Product)
            .AsSplitQuery();

    /// <summary>Purchase -&gt; Items, which only handlers that settle quantity against the purchase need.</summary>
    public static IQueryable<PurchaseReturn> WithPurchaseItems(this IQueryable<PurchaseReturn> query) =>
        query.Include(x => x.Purchase!).ThenInclude(p => p.Items);
}
