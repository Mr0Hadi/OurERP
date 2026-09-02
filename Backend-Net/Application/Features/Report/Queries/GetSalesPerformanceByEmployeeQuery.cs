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

            res.Message = "گزارش عملکرد فروش کارمندان با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
