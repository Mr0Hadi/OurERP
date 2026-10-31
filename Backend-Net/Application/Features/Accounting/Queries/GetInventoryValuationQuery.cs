using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Application.Features.Accounting.Dtos;
using Common.Extensions;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Accounting.Queries
{
    public enum InventoryValuationSortEnum
    {
        TOTAL_VALUE = 0,
        NAME = 1,
        CODE = 2,
        STOCK = 3,
        AVERAGE_COST = 4,
        OFF_POOL_VALUE = 5,
    }

    /// <summary>
    /// The value of stock on hand (ارزش موجودی), product by product, as the inventory cost ledger records it now. A
    /// read of existing data only: how cost is assigned is the costing feature's business, not this page's.
    /// </summary>
    public class GetInventoryValuationQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        public int? ProductCategoryId { get; set; }

        /// <summary>Leave out products whose total value is 0.</summary>
        public bool OnlyWithValue { get; set; }

        /// <summary>Name or code, contains.</summary>
        public string? Search { get; set; }

        public InventoryValuationSortEnum? SortBy { get; set; }
        public SortDirectionEnum? SortDirection { get; set; }
    }

    public class GetInventoryValuationQueryHandler : IRequestHandler<GetInventoryValuationQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetInventoryValuationQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        /// <summary>Every product's valuation, filtered - shared with the dashboard and the export.</summary>
        public static IQueryable<InventoryValuationRowDto> Build(IWMSDbContext context, GetInventoryValuationQuery request)
        {
            // The latest row of a product is its highest Id - the same rule InventoryCostingService.LatestEntryAsync uses.
            var ledger = context.InventoryCostLedgerEntries;
            var units = context.ProductUnits;

            var query = context.Products
                .Select(p => new
                {
                    Product = p,
                    Last = ledger.Where(e => e.ProductId == p.Id).OrderByDescending(e => e.Id)
                        .Select(e => new { e.RunningQuantity, e.RunningAverageCost, e.RunningInventoryValue })
                        .FirstOrDefault(),
                    OffPool = ledger.Where(e => e.ProductId == p.Id).Sum(e => e.OffPoolValueDelta),
                    Quarantined = units.Count(u => u.ProductId == p.Id && u.Status == ProductUnitStatusEnum.QUARANTINED),
                    Reserved = units.Count(u => u.ProductId == p.Id && u.Status == ProductUnitStatusEnum.RESERVED),
                    InTransit = units.Count(u => u.ProductId == p.Id && u.Status == ProductUnitStatusEnum.IN_TRANSIT),
                })
                .Where(x => x.Product.IsActive || (x.Last != null && x.Last.RunningInventoryValue != 0m) || x.OffPool != 0m)
                .Select(x => new InventoryValuationRowDto
                {
                    ProductId = x.Product.Id,
                    Code = x.Product.Code,
                    Name = x.Product.Name,
                    ProductCategoryId = x.Product.ProductCategoryId,
                    ProductCategoryName = x.Product.ProductCategory.Name,
                    Unit = x.Product.Unit,
                    IsActive = x.Product.IsActive,
                    Stock = x.Product.Stock,
                    ReservedQuantity = x.Reserved,
                    InTransitQuantity = x.InTransit,
                    LedgerQuantity = x.Last != null ? x.Last.RunningQuantity : 0,
                    AverageCost = x.Last != null ? x.Last.RunningAverageCost : 0m,
                    PoolValue = x.Last != null ? x.Last.RunningInventoryValue : 0m,
                    QuarantinedQuantity = x.Quarantined,
                    OffPoolValue = x.OffPool,
                    TotalValue = (x.Last != null ? x.Last.RunningInventoryValue : 0m) + x.OffPool,
                });

            if (request.ProductCategoryId.HasValue)
                query = query.Where(x => x.ProductCategoryId == request.ProductCategoryId);
            if (request.OnlyWithValue)
                query = query.Where(x => x.TotalValue != 0m);
            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var search = request.Search.Trim();
                query = query.Where(x => x.Name.Contains(search) || x.Code.Contains(search));
            }

            return query;
        }

        public static IOrderedQueryable<InventoryValuationRowDto> Sort(IQueryable<InventoryValuationRowDto> query, InventoryValuationSortEnum? sortBy, SortDirectionEnum? sortDirection)
        {
            // Default: the most valuable stock first.
            var direction = SortingExtensions.ResolveDirection(sortBy.HasValue, sortDirection, SortDirectionEnum.DESC);
            var sorted = sortBy switch
            {
                InventoryValuationSortEnum.NAME => query.SortBy(x => x.Name, direction),
                InventoryValuationSortEnum.CODE => query.SortBy(x => x.Code, direction),
                InventoryValuationSortEnum.STOCK => query.SortBy(x => x.Stock, direction),
                InventoryValuationSortEnum.AVERAGE_COST => query.SortBy(x => x.AverageCost, direction),
                InventoryValuationSortEnum.OFF_POOL_VALUE => query.SortBy(x => x.OffPoolValue, direction),
                _ => query.SortBy(x => x.TotalValue, direction),
            };
            return sorted.ThenSortBy(x => x.ProductId, direction);
        }

        public static Task<InventoryValuationSummaryDto?> SummarizeAsync(IQueryable<InventoryValuationRowDto> query, CancellationToken cancellationToken) =>
            query.GroupBy(x => 1)
                .Select(g => new InventoryValuationSummaryDto
                {
                    ProductCount = g.Count(),
                    Stock = g.Sum(x => x.Stock),
                    ReservedQuantity = g.Sum(x => x.ReservedQuantity),
                    InTransitQuantity = g.Sum(x => x.InTransitQuantity),
                    QuarantinedQuantity = g.Sum(x => x.QuarantinedQuantity),
                    PoolValue = g.Sum(x => x.PoolValue),
                    OffPoolValue = g.Sum(x => x.OffPoolValue),
                    TotalValue = g.Sum(x => x.TotalValue),
                })
                .FirstOrDefaultAsync(cancellationToken);

        public async Task<ResponseDto> Handle(GetInventoryValuationQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var query = Build(_context, request);
            var summary = await SummarizeAsync(query, cancellationToken) ?? new InventoryValuationSummaryDto();
            var paged = await Sort(query, request.SortBy, request.SortDirection).ToPagedAsync(request.Page, request.Take, cancellationToken);

            res.Data = new
            {
                InventoryValuation = paged.Items,
                Summary = summary,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = paged.PageCount,
                    Take = request.Take,
                    Total = paged.TotalCount
                }
            };
            res.Message = "ارزش موجودی با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
