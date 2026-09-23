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
    /// Ranks employees by the purchases they handled (Purchase.PurchasingUserId, set from the
    /// logged-in user at CreatePurchase time). Purchases with no PurchasingUserId (created
    /// before this field existed) are excluded rather than grouped into a fake row.
    /// </summary>
    public class GetSupplyPerformanceByEmployeeQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public SupplyPerformanceByEmployeeSortEnum? SortBy { get; set; }
        public SortDirectionEnum? SortDirection { get; set; }
    }

    public enum SupplyPerformanceByEmployeeSortEnum
    {
        TOTAL_INVOICE_AMOUNT = 0,
        FULL_NAME = 1,
        PURCHASES_COUNT = 2,
    }

    public class GetSupplyPerformanceByEmployeeQueryHandler : IRequestHandler<GetSupplyPerformanceByEmployeeQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetSupplyPerformanceByEmployeeQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetSupplyPerformanceByEmployeeQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var query = _context.Purchases.Where(x => x.PurchasingUserId.HasValue);

            if (request.FromDate.HasValue)
                query = query.Where(x => x.InvoiceDate >= request.FromDate.Value);

            if (request.ToDate.HasValue)
                query = query.Where(x => x.InvoiceDate <= request.ToDate.Value);

            var grouped = query
                .GroupBy(x => new { x.PurchasingUserId, x.PurchasingUser.FirstName, x.PurchasingUser.LastName })
                .Select(g => new SupplyPerformanceByEmployeeDto
                {
                    UserId = g.Key.PurchasingUserId!.Value,
                    FullName = g.Key.FirstName + " " + g.Key.LastName,
                    PurchasesCount = g.Count(),
                    TotalInvoiceAmount = (UInt64)g.Sum(x => (decimal)x.TotalAmount)
                });

            // Default: top buyers first.
            var direction = SortingExtensions.ResolveDirection(request.SortBy.HasValue, request.SortDirection, SortDirectionEnum.DESC);
            var sorted = request.SortBy switch
            {
                SupplyPerformanceByEmployeeSortEnum.FULL_NAME => grouped.SortBy(x => x.FullName, direction),
                SupplyPerformanceByEmployeeSortEnum.PURCHASES_COUNT => grouped.SortBy(x => x.PurchasesCount, direction),
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

            res.Message = "گزارش عملکرد خرید کارمندان با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
