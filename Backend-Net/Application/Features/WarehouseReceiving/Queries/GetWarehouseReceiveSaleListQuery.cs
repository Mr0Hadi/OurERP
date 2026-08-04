using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.WarehouseReceiving.Dtos;
using Common.Extensions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.WarehouseReceiving.Queries
{
    public class GetWarehouseReceiveSaleListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        public string? Search { get; set; }
        public int? CustomerId { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
    }

    public class GetWarehouseReceiveSaleListQueryHandler : IRequestHandler<GetWarehouseReceiveSaleListQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetWarehouseReceiveSaleListQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetWarehouseReceiveSaleListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var query = _context.Sales
                .Include(x => x.Customer)
                .Where(x => x.IsActive && x.Status == Domain.Enums.SalesStatusEnum.CANCELLED)
                .AsQueryable();

            if (!string.IsNullOrEmpty(request.Search))
            {
                var search = request.Search.Trim();
                query = query.Where(x => x.InvoiceNumber.Contains(search) ||
                                         x.Customer.FirstName.Contains(search) ||
                                         x.Customer.LastName.Contains(search));
            }

            if (request.CustomerId.HasValue)
            {
                query = query.Where(x => x.CustomerId == request.CustomerId.Value);
            }

            if (request.FromDate.HasValue)
            {
                query = query.Where(x => x.InvoiceDate >= request.FromDate.Value);
            }

            if (request.ToDate.HasValue)
            {
                query = query.Where(x => x.InvoiceDate <= request.ToDate.Value);
            }

            var data = await query
                .OrderByDescending(x => x.InvoiceDate)
                .Select(p => new ReceiveSaleReturnListDto
                {
                    Id = p.Id,
                    InvoiceNumber = p.InvoiceNumber,
                    InvoiceDate = p.InvoiceDate,
                    CustomerId = p.CustomerId,
                    CustomerName = p.Customer.FirstName + " " + p.Customer.LastName,
                }).ToPaged(request.Page, request.Take, out int pageCount, out int totalCount).ToListAsync(cancellationToken);

            res.Data = new
            {
                ReceiveList = data,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = pageCount,
                    Take = request.Take,
                    Total = totalCount
                }
            };

            res.Message = "لیست خریدهای قابل دریافت با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
