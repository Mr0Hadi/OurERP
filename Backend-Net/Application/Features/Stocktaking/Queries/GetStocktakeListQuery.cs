using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Application.Features.Accounting;
using Common.Extensions;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Stocktaking.Queries
{
    public enum StocktakeListSortEnum
    {
        CREATED_AT = 0,
        NUMBER = 1,
        STATUS = 2,
    }

    /// <summary>Stocktake sessions, newest first (no lines - those are in the detail).</summary>
    public class GetStocktakeListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        public List<StocktakeStatusEnum>? Statuses { get; set; }
        public int? WarehouseId { get; set; }

        /// <summary>On CreatedAt, both days inclusive.</summary>
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }

        /// <summary>Number or title, contains.</summary>
        public string? Search { get; set; }
        public StocktakeListSortEnum? SortBy { get; set; }
        public SortDirectionEnum? SortDirection { get; set; }
    }

    public class GetStocktakeListQueryHandler : IRequestHandler<GetStocktakeListQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetStocktakeListQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetStocktakeListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var query = _context.Stocktakes.AsNoTracking();
            if (request.Statuses is { Count: > 0 })
                query = query.Where(x => request.Statuses.Contains(x.Status));
            if (request.WarehouseId.HasValue)
                query = query.Where(x => x.WarehouseId == request.WarehouseId);
            var from = DateRange.Start(request.FromDate);
            var to = DateRange.EndExclusive(request.ToDate);
            if (from.HasValue)
                query = query.Where(x => x.CreatedAt >= from);
            if (to.HasValue)
                query = query.Where(x => x.CreatedAt < to);
            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var search = request.Search.Trim();
                query = query.Where(x => x.Number.Contains(search) || x.Title.Contains(search));
            }

            var direction = SortingExtensions.ResolveDirection(request.SortBy.HasValue, request.SortDirection, SortDirectionEnum.DESC);
            var sorted = request.SortBy switch
            {
                StocktakeListSortEnum.NUMBER => query.SortBy(x => x.Number, direction),
                StocktakeListSortEnum.STATUS => query.SortBy(x => x.Status, direction),
                _ => query.SortBy(x => x.CreatedAt, direction),
            };

            var paged = await sorted.ThenSortBy(x => x.Id, direction).Select(StocktakeReader.Header).ToPagedAsync(request.Page, request.Take, cancellationToken);
            foreach (var item in paged.Items)
                item.StatusTitle = item.Status.GetDescription();

            res.Data = new
            {
                StocktakeList = paged.Items,
                Page = new ResponsePageDto { Page = request.Page, PageCount = paged.PageCount, Take = request.Take, Total = paged.TotalCount },
            };
            res.Message = "فهرست انبارگردانی‌ها ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
