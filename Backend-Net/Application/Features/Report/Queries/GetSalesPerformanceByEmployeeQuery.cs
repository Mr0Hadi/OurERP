using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Application.Features.Report.Dtos;
using Common.Extensions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Report.Queries
{
    /// <summary>
    /// Ranks employees by their own sales (Sale.SalesUserId, set from the logged-in user at
    /// CreateSale time). Sales with no SalesUserId (created before this field existed) are
    /// excluded rather than grouped into a fake "unassigned" employee row.
    /// </summary>
    public class GetSalesPerformanceByEmployeeQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public SalesPerformanceByEmployeeSortEnum? SortBy { get; set; }
        public SortDirectionEnum? SortDirection { get; set; }
    }

    public enum SalesPerformanceByEmployeeSortEnum
    {
        TOTAL_INVOICE_AMOUNT = 0,
        FULL_NAME = 1,
        SALES_COUNT = 2,
    }

    public class GetSalesPerformanceByEmployeeQueryHandler : IRequestHandler<GetSalesPerformanceByEmployeeQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetSalesPerformanceByEmployeeQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetSalesPerformanceByEmployeeQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var query = _context.Sales.Where(x => x.SalesUserId.HasValue);

            if (request.FromDate.HasValue)
                query = query.Where(x => x.InvoiceDate >= request.FromDate.Value);

            if (request.ToDate.HasValue)
                query = query.Where(x => x.InvoiceDate <= request.ToDate.Value);

            var grouped = query
                .GroupBy(x => new { x.SalesUserId, x.SalesUser.FirstName, x.SalesUser.LastName })
                .Select(g => new SalesPerformanceByEmployeeDto
                {
                    UserId = g.Key.SalesUserId!.Value,
                    FullName = g.Key.FirstName + " " + g.Key.LastName,
                    SalesCount = g.Count(),
                    TotalInvoiceAmount = (UInt64)g.Sum(x => (decimal)x.TotalAmount)
                });

            // Default: top sellers first.
            var direction = SortingExtensions.ResolveDirection(request.SortBy.HasValue, request.SortDirection, SortDirectionEnum.DESC);
            var sorted = request.SortBy switch
            {
                SalesPerformanceByEmployeeSortEnum.FULL_NAME => grouped.SortBy(x => x.FullName, direction),
                SalesPerformanceByEmployeeSortEnum.SALES_COUNT => grouped.SortBy(x => x.SalesCount, direction),
                _ => grouped.SortBy(x => x.TotalInvoiceAmount, direction),
            };

            var paged = await sorted.ThenSortBy(x => x.UserId, direction).ToPagedAsync(request.Page, request.Take, cancellationToken);

            res.Data = new
            {
                Employees = paged.Items,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = paged.PageCount,
                    Take = request.Take,
                    Total = paged.TotalCount
                }
            };

            res.Message = "گزارش عملکرد فروش کارمندان با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
