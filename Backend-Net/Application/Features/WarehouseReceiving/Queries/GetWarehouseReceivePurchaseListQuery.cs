using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.WarehouseReceiving.Dtos;
using Common.Extensions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.WarehouseReceiving.Queries
{
    public class GetWarehouseReceivePurchaseListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        public string? Search { get; set; }
        public int? SupplierId { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
    }

    public class GetWarehouseReceivePurchaseListQueryHandler : IRequestHandler<GetWarehouseReceivePurchaseListQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetWarehouseReceivePurchaseListQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetWarehouseReceivePurchaseListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var query = _context.Purchases
                .Include(x => x.Supplier)
                .Where(x => x.IsActive && x.Status == Domain.Enums.PurchaseStatusEnum.SHIPPED)
                .AsQueryable();

            if (!string.IsNullOrEmpty(request.Search))
            {
                var search = request.Search.Trim();
                query = query.Where(x => x.InvoiceNumber.Contains(search) ||
                                         x.Supplier.CompanyName.Contains(search));
            }

            if (request.SupplierId.HasValue)
            {
                query = query.Where(x => x.SupplierId == request.SupplierId.Value);
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
                .Select(p => new ReceivePurchaseListDto
                {
                    Id = p.Id,
                    InvoiceNumber = p.InvoiceNumber,
                    InvoiceDate = p.InvoiceDate,
                    Type = Domain.Enums.ReceiveTypeEnum.Purchase,
                    SupplierId = p.SupplierId,
                    SupplierName = p.Supplier.CompanyName
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
