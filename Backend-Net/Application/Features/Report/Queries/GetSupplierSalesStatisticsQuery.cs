using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Report.Dtos;
using Common.Extensions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Report.Queries
{
    /// <summary>Ranks suppliers by how much they have supplied to us, from Purchase.SupplierId/TotalAmount/PaidAmount.</summary>
    public class GetSupplierSalesStatisticsQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
    }

    public class GetSupplierSalesStatisticsQueryHandler : IRequestHandler<GetSupplierSalesStatisticsQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetSupplierSalesStatisticsQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetSupplierSalesStatisticsQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var query = _context.Purchases.AsQueryable();

            if (request.FromDate.HasValue)
                query = query.Where(x => x.InvoiceDate >= request.FromDate.Value);

            if (request.ToDate.HasValue)
                query = query.Where(x => x.InvoiceDate <= request.ToDate.Value);

            var grouped = query
                .GroupBy(x => new { x.SupplierId, x.Supplier.CompanyName })
                .Select(g => new SupplierSalesStatisticsDto
                {
                    SupplierId = g.Key.SupplierId,
                    CompanyName = g.Key.CompanyName,
                    PurchasesCount = g.Count(),
                    TotalInvoiceAmount = (UInt64)g.Sum(x => (decimal)x.TotalAmount),
                    TotalPaidAmount = (UInt64)g.Sum(x => (decimal)x.PaidAmount)
                })
                .OrderByDescending(x => x.TotalInvoiceAmount);

            var paged = await grouped.ToPagedAsync(request.Page, request.Take, cancellationToken);

            res.Data = new
            {
                Suppliers = paged.Items,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = paged.PageCount,
                    Take = request.Take,
                    Total = paged.TotalCount
                }
            };

            res.Message = "آمار تامین تامین‌کنندگان با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
