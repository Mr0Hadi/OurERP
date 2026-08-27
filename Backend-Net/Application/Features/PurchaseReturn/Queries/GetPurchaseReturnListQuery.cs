using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.PurchaseReturn.Dtos;
using Common.Extensions;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.PurchaseReturn.Queries
{
    public class GetPurchaseReturnListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        public string? Search { get; set; }
        public int? SupplierId { get; set; }
        public ReturnStatusEnum? Status { get; set; }
        public ReturnProblemEnum? Problem { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
    }

    public class GetPurchaseReturnListQueryHandler : IRequestHandler<GetPurchaseReturnListQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetPurchaseReturnListQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetPurchaseReturnListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var query = _context.PurchaseReturns
                .Include(x => x.Purchase)
                    .ThenInclude(x => x.Supplier)
                .Include(x => x.Claims)
                .AsQueryable();

            if (!string.IsNullOrEmpty(request.Search))
            {
                var search = request.Search.Trim();
                query = query.Where(x => x.ReturnNumber.Contains(search) ||
                                         x.Purchase.InvoiceNumber.Contains(search) ||
                                         x.Purchase.Supplier.CompanyName.Contains(search));
            }

            if (request.SupplierId.HasValue)
            {
                query = query.Where(x => x.Purchase.SupplierId == request.SupplierId.Value);
            }

            if (request.Status.HasValue)
            {
                query = query.Where(x => x.Status == request.Status.Value);
            }

            if (request.FromDate.HasValue)
            {
                query = query.Where(x => x.ReturnDate >= request.FromDate.Value);
            }

            if (request.ToDate.HasValue)
            {
                query = query.Where(x => x.ReturnDate <= request.ToDate.Value);
            }

            if (request.Problem.HasValue)
            {
                query = query.Where(x => x.Claims.Any(c => c.Problem == request.Problem.Value));
            }

            var paged = await query
                .OrderByDescending(x => x.CreatedAt)
                .Select(x => new PurchaseReturnListDto
                {
                    Id = x.Id,
                    ReturnNumber = x.ReturnNumber,
                    ReturnDate = x.ReturnDate,
                    PurchaseId = x.PurchaseId,
                    PurchaseInvoiceNumber = x.Purchase.InvoiceNumber,
                    SupplierId = x.Purchase.SupplierId,
                    SupplierName = x.Purchase.Supplier.CompanyName,
                    CreatedAt = x.CreatedAt,
                    Status = x.Status,
                    DominantProblem = x.Claims.OrderByDescending(c => c.Quantity).Select(c => c.Problem).FirstOrDefault(),
                    TotalQuantity = x.Claims.Sum(c => c.Quantity),
                    TotalAmount = (UInt64)x.Claims.Sum(c => (long)c.Quantity * (long)c.UnitPrice),
                })
                .ToPagedAsync(request.Page, request.Take, cancellationToken);

            res.Data = new
            {
                ReturnList = paged.Items,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = paged.PageCount,
                    Take = request.Take,
                    Total = paged.TotalCount
                }
            };
            res.Message = "لیست مرجوعی‌ها با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
