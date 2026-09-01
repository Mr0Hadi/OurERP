using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
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
                })
                .OrderByDescending(x => x.TotalInvoiceAmount);

            var paged = await grouped.ToPagedAsync(request.Page, request.Take, cancellationToken);

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
