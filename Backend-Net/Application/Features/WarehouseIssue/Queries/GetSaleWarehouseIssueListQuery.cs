using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Common.Extensions;
using Domain.Enums;
using MediatR;

namespace Application.Features.WarehouseIssue.Queries
{
    public enum SaleWarehouseIssueListSortEnum
    {
        REPORTED_AT = 0,
        PRODUCT_NAME = 1,
        REASON = 2,
        RESOLVED_AT = 3,
    }

    /// <summary>
    /// Accounting's inbox: units the warehouse reported damaged/defective/expired/missing while checking a proforma
    /// (CheckSaleWarehouse). Filter IsOpen=true for the ones that still need a decision (ResolveSaleWarehouseIssue).
    /// </summary>
    public class GetSaleWarehouseIssueListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;

        /// <summary>true = still waiting for accounting, false = decided, null = both.</summary>
        public bool? IsOpen { get; set; }
        public int? SaleId { get; set; }
        public int? ProductId { get; set; }
        public UnitActionReasonEnum? Reason { get; set; }

        /// <summary>On ReportedAt, inclusive.</summary>
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }

        public SaleWarehouseIssueListSortEnum? SortBy { get; set; }
        public SortDirectionEnum? SortDirection { get; set; }
    }

    public class GetSaleWarehouseIssueListQueryHandler : IRequestHandler<GetSaleWarehouseIssueListQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetSaleWarehouseIssueListQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetSaleWarehouseIssueListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var query = _context.SaleWarehouseIssues.AsQueryable();

            if (request.IsOpen.HasValue)
                query = request.IsOpen.Value ? query.Where(x => x.ResolvedAt == null) : query.Where(x => x.ResolvedAt != null);

            if (request.SaleId.HasValue)
                query = query.Where(x => x.SaleId == request.SaleId);

            if (request.ProductId.HasValue)
                query = query.Where(x => x.ProductId == request.ProductId);

            if (request.Reason.HasValue)
                query = query.Where(x => x.Reason == request.Reason);

            if (request.FromDate.HasValue)
                query = query.Where(x => x.ReportedAt >= request.FromDate.Value.Date);

            if (request.ToDate.HasValue)
                query = query.Where(x => x.ReportedAt < request.ToDate.Value.Date.AddDays(1));

            // Default: newest report first.
            var direction = SortingExtensions.ResolveDirection(request.SortBy.HasValue, request.SortDirection, SortDirectionEnum.DESC);
            var sorted = request.SortBy switch
            {
                SaleWarehouseIssueListSortEnum.PRODUCT_NAME => query.SortBy(x => x.Product.Name, direction),
                SaleWarehouseIssueListSortEnum.REASON => query.SortBy(x => x.Reason, direction),
                SaleWarehouseIssueListSortEnum.RESOLVED_AT => query.SortBy(x => x.ResolvedAt, direction),
                _ => query.SortBy(x => x.ReportedAt, direction),
            };

            var paged = await sorted.ThenSortBy(x => x.Id, direction)
                .Select(SaleWarehouseIssueProjection.ToDto(_context))
                .ToPagedAsync(request.Page, request.Take, cancellationToken);

            foreach (var item in paged.Items)
                SaleWarehouseIssueProjection.FillTitles(item);

            res.Data = new
            {
                SaleWarehouseIssueList = paged.Items,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = paged.PageCount,
                    Take = request.Take,
                    Total = paged.TotalCount
                }
            };
            res.Message = "فهرست گزارش‌های انبار با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
