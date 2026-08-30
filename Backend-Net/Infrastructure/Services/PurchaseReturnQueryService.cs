using Application.Common.Contracts.PurchaseReturn;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services
{
    public class PurchaseReturnQueryService : IPurchaseReturnQueryService
    {
        public IQueryable<Domain.Entities.PurchaseReturn> WhereNotDeleted(IQueryable<Domain.Entities.PurchaseReturn> query)
        {
            return query.Where(x => x.IsActive);
        }

        public IQueryable<Domain.Entities.PurchaseReturn> WhereActive(IQueryable<Domain.Entities.PurchaseReturn> query)
        {
            return WhereNotDeleted(query).Where(x => x.Status == ReturnStatusEnum.OPEN || x.Status == ReturnStatusEnum.IN_PROGRESS);
        }

        public IQueryable<Domain.Entities.PurchaseReturn> WithReturnGraph(IQueryable<Domain.Entities.PurchaseReturn> query, bool includePurchaseItems = false)
        {
            query = query
                .Include(x => x.Claims)
                    .ThenInclude(x => x.Product)
                .Include(x => x.Claims)
                    .ThenInclude(x => x.Resolutions)
                        .ThenInclude(x => x.Effects)
                            .ThenInclude(x => x.History)
                                .ThenInclude(x => x.Observations)
                .Include(x => x.Claims)
                    .ThenInclude(x => x.Resolutions)
                        .ThenInclude(x => x.Effects)
                            .ThenInclude(x => x.MoneyParts);

            if (includePurchaseItems)
            {
                query = query
                    .Include(x => x.Purchase!)
                        .ThenInclude(x => x.Items);
            }

            return query;
        }

        public IQueryable<Domain.Entities.PurchaseReturn> ActiveWithReturnGraph(IQueryable<Domain.Entities.PurchaseReturn> query)
        {
            return WithReturnGraph(WhereActive(query));
        }
    }
}
