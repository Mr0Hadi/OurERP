using Application.Common.Contracts.SaleReturn;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services
{
    public class SaleReturnQueryService : ISaleReturnQueryService
    {
        public IQueryable<Domain.Entities.SaleReturn> WhereActive(IQueryable<Domain.Entities.SaleReturn> query)
        {
            return query.Where(x => x.Status == ReturnStatusEnum.OPEN || x.Status == ReturnStatusEnum.IN_PROGRESS);
        }

        public IQueryable<Domain.Entities.SaleReturn> WithReturnGraph(IQueryable<Domain.Entities.SaleReturn> query, bool includeSaleItems = false)
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

            if (includeSaleItems)
            {
                query = query
                    .Include(x => x.Sale!)
                        .ThenInclude(x => x.Items);
            }

            return query;
        }

        public IQueryable<Domain.Entities.SaleReturn> ActiveWithReturnGraph(IQueryable<Domain.Entities.SaleReturn> query)
        {
            return WithReturnGraph(WhereActive(query));
        }
    }
}
