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
        /// <summary>All returns filed against one purchase - the sale side already had the
        /// equivalent SaleId filter, so this was the only way a document's returns could not be
        /// pulled together. Combined with PreviousReturnId on each row it is what makes a chain
        /// of related returns visible.</summary>
        public int? PurchaseId { get; set; }
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
                .Where(x => x.IsActive)
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

            if (request.PurchaseId.HasValue)
            {
                query = query.Where(x => x.PurchaseId == request.PurchaseId.Value);
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
                    PreviousReturnId = x.PreviousReturnId,
                    Status = x.Status,
                    Problems = x.Claims.OrderByDescending(c => c.Quantity).Select(c => c.Problem).ToList(),
                    TotalQuantity = x.Claims.Sum(c => c.Quantity),
                    TotalAmount = (UInt64)x.Claims.Sum(c => (long)c.Quantity * (long)c.UnitPrice),
                })
                .ToPagedAsync(request.Page, request.Take, cancellationToken);

            // Distinct() inside the projection is not reliably translatable to SQL, so the
            // page is deduped after materialisation - the same reason signed image URLs are
            // built here rather than in the projection. Ordering by claim quantity survives,
            // so the old DominantProblem is simply Problems[0].
            foreach (var item in paged.Items)
                item.Problems = item.Problems.Distinct().ToList();

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
