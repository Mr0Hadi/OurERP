using Domain.Enums;
using Microsoft.EntityFrameworkCore;
using SaleReturn = Domain.Entities.SaleReturn;

namespace Application.Common.Queries;

/// <summary>
/// The sale-side twin of <see cref="PurchaseReturnQueryExtensions"/>; see that class for the
/// rationale. Kept deliberately identical in shape so the two return domains never drift.
/// </summary>
public static class SaleReturnQueryExtensions
{
    private static readonly ReturnStatusEnum[] OpenStatuses = [ReturnStatusEnum.OPEN, ReturnStatusEnum.IN_PROGRESS];

    /// <summary>
    /// Drops soft-deleted returns (IsActive = false). No global query filter in this project
    /// (CLAUDE.md section 7), so every read of SaleReturns must compose this explicitly.
    /// </summary>
    public static IQueryable<SaleReturn> WhereNotDeleted(this IQueryable<SaleReturn> query) =>
        query.Where(x => x.IsActive);

    /// <summary>Status filter only; compose with <see cref="WhereNotDeleted"/> for live returns.</summary>
    public static IQueryable<SaleReturn> WhereOpen(this IQueryable<SaleReturn> query) =>
        query.Where(x => OpenStatuses.Contains(x.Status));

    /// <summary>
    /// Claims -&gt; (Product, Resolutions -&gt; Effects -&gt; (History -&gt; Observations, MoneyParts, Product)).
    /// Split per collection - four nested collections in one JOIN multiply the row count at every level.
    /// </summary>
    public static IQueryable<SaleReturn> WithReturnGraph(this IQueryable<SaleReturn> query) =>
        query
            .Include(x => x.Claims).ThenInclude(c => c.Product)
            .Include(x => x.Claims).ThenInclude(c => c.Resolutions).ThenInclude(r => r.Effects)
                .ThenInclude(e => e.History).ThenInclude(h => h.Observations)
            .Include(x => x.Claims).ThenInclude(c => c.Resolutions).ThenInclude(r => r.Effects)
                .ThenInclude(e => e.MoneyParts)
            // An effect's product can differ from its claim's (a replacement).
            .Include(x => x.Claims).ThenInclude(c => c.Resolutions).ThenInclude(r => r.Effects)
                .ThenInclude(e => e.Product)
            .AsSplitQuery();

    /// <summary>Sale -&gt; Items, which only handlers that settle quantity against the sale need.</summary>
    public static IQueryable<SaleReturn> WithSaleItems(this IQueryable<SaleReturn> query) =>
        query.Include(x => x.Sale!).ThenInclude(s => s.Items);
}
