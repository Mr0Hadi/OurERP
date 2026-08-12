using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.SaleReturn
{
    /// <summary>
    /// The Include spines every SaleReturn handler needs, in one place.
    ///
    /// This is not just noise-removal: ISaleReturnCalculationService.RecomputeReturnStatus and the
    /// SaleReturn/SaleReturnClaim/SaleReturnItem roll-up properties all sum over the loaded graph,
    /// so a handler that forgets a ThenInclude does not fail - it silently computes a status from
    /// empty collections and persists it. Any handler that recomputes a status must load
    /// WithReturnGraph().
    /// </summary>
    public static class SaleReturnQueryExtensions
    {
        /// <summary>
        /// Returns still reserving quantity against their sale items. A sale can have several at
        /// once, which is what GetOpenClaimQuantity arbitrates between.
        /// </summary>
        public static IQueryable<Domain.Entities.SaleReturn> WhereActive(this IQueryable<Domain.Entities.SaleReturn> query)
        {
            return query.Where(x => x.Status == SaleReturnStatusEnum.PENDING_INSPECTION ||
                                    x.Status == SaleReturnStatusEnum.COORDINATING);
        }

        /// <summary>Claims -> (Product, InspectionItems -> Decisions): everything the return's own math reads.</summary>
        public static IQueryable<Domain.Entities.SaleReturn> WithReturnGraph(this IQueryable<Domain.Entities.SaleReturn> query)
        {
            return query
                .Include(x => x.Claims)
                    .ThenInclude(x => x.Product)
                .Include(x => x.Claims)
                    .ThenInclude(x => x.InspectionItems)
                        .ThenInclude(x => x.Decisions);
        }

        /// <summary>
        /// Sale -> Items. Only needed by handlers that settle quantity against the sale
        /// (AddSaleReturnDecision) - see the note in ISaleReturnCalculationService.RecomputeSaleStatus.
        /// </summary>
        public static IQueryable<Domain.Entities.SaleReturn> WithSaleItems(this IQueryable<Domain.Entities.SaleReturn> query)
        {
            return query
                .Include(x => x.Sale!)
                    .ThenInclude(x => x.Items);
        }
    }
}
