using Application.Common.Contracts.SaleReturn;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services
{
    public class SaleReturnQueryService : ISaleReturnQueryService
    {
        public IQueryable<Domain.Entities.SaleReturn> WhereActive(IQueryable<Domain.Entities.SaleReturn> query)
        {
            return query.Where(x => x.Status == SaleReturnStatusEnum.PENDING_INSPECTION ||
                                    x.Status == SaleReturnStatusEnum.COORDINATING);
        }

        public IQueryable<Domain.Entities.SaleReturn> WithReturnGraph(IQueryable<Domain.Entities.SaleReturn> query, bool includeSaleItems = false)
        {
            query = query
                .Include(x => x.Claims)
                    .ThenInclude(x => x.Product)
                .Include(x => x.Claims)
                    .ThenInclude(x => x.InspectionItems)
                        .ThenInclude(x => x.Decisions);

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
