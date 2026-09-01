using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Report.Dtos;
using Common.Extensions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Report.Queries
{
    /// <summary>Ranks customers by how much they have bought, from Sale.CustomerId/TotalAmount/PaidAmount.</summary>
    public class GetCustomerPurchaseStatisticsQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
    }

    public class GetCustomerPurchaseStatisticsQueryHandler : IRequestHandler<GetCustomerPurchaseStatisticsQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetCustomerPurchaseStatisticsQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetCustomerPurchaseStatisticsQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var query = _context.Sales.AsQueryable();

            if (request.FromDate.HasValue)
                query = query.Where(x => x.InvoiceDate >= request.FromDate.Value);

            if (request.ToDate.HasValue)
                query = query.Where(x => x.InvoiceDate <= request.ToDate.Value);

            var grouped = query
                .GroupBy(x => new { x.CustomerId, x.Customer.FirstName, x.Customer.LastName })
                .Select(g => new CustomerPurchaseStatisticsDto
                {
                    CustomerId = g.Key.CustomerId,
                    FullName = g.Key.FirstName + " " + g.Key.LastName,
                    SalesCount = g.Count(),
                    TotalInvoiceAmount = (UInt64)g.Sum(x => (decimal)x.TotalAmount),
                    TotalPaidAmount = (UInt64)g.Sum(x => (decimal)x.PaidAmount)
                })
                .OrderByDescending(x => x.TotalInvoiceAmount);

            var paged = await grouped.ToPagedAsync(request.Page, request.Take, cancellationToken);

            res.Data = new
            {
                Customers = paged.Items,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = paged.PageCount,
                    Take = request.Take,
                    Total = paged.TotalCount
                }
            };

            res.Message = "آمار خرید مشتریان با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
