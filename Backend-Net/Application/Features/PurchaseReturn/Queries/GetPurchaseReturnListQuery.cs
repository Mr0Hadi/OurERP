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
        public PurchaseReturnStatusEnum? Status { get; set; }
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
                .Include(x => x.Items)
                .Where(x => x.IsActive)
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

            var data = await query
                .OrderByDescending(x => x.ReturnDate)
                .Select(x => new PurchaseReturnListDto
                {
                    Id = x.Id,
                    ReturnNumber = x.ReturnNumber,
                    PurchaseId = x.PurchaseId,
                    PurchaseInvoiceNumber = x.Purchase.InvoiceNumber,
                    SupplierId = x.Purchase.SupplierId,
                    SupplierName = x.Purchase.Supplier.CompanyName,
                    ReturnDate = x.ReturnDate,
                    Status = x.Status,
                    DominantIssueType = x.Items.OrderByDescending(i => i.Quantity).Select(i => i.IssueType).FirstOrDefault(),
                    TotalQuantity = x.Items.Sum(i => i.Quantity),
                    TotalAmount = (UInt64)x.Items.Sum(i => (long)i.Quantity * (long)i.UnitPrice),
                    Description = x.Description,
                })
                .ToPaged(request.Page, request.Take, out int pageCount, out int totalCount)
                .ToListAsync(cancellationToken);

            res.Data = new
            {
                ReturnList = data,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = pageCount,
                    Take = request.Take,
                    Total = totalCount
                }
            };
            res.Message = "لیست مرجوعی‌ها با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
