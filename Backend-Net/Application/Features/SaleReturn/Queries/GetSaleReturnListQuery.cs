using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Queries;
using Application.Common.Enums;
using Application.Features.SaleReturn.Dtos;
using Common.Extensions;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.SaleReturn.Queries
{
    public class GetSaleReturnListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        public string? Search { get; set; }
        public int? SaleId { get; set; }
        public int? CustomerId { get; set; }
        public ReturnStatusEnum? Status { get; set; }
        public ReturnProblemEnum? Problem { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
    }

    public class GetSaleReturnListQueryHandler : IRequestHandler<GetSaleReturnListQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetSaleReturnListQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetSaleReturnListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var query = _context.SaleReturns
                .WhereNotDeleted()
                .Include(x => x.Sale!)
                    .ThenInclude(x => x.Customer)
                .Include(x => x.Claims)
                .AsQueryable();

            if (!string.IsNullOrEmpty(request.Search))
            {
                var search = request.Search.Trim();
                query = query.Where(x => x.ReturnNumber.Contains(search) ||
                                         x.Sale!.InvoiceNumber.Contains(search) ||
                                         (x.Sale!.Customer.FirstName + " " + x.Sale!.Customer.LastName).Contains(search));
            }

            if (request.SaleId.HasValue)
            {
                query = query.Where(x => x.SaleId == request.SaleId.Value);
            }

            if (request.CustomerId.HasValue)
            {
                query = query.Where(x => x.Sale!.CustomerId == request.CustomerId.Value);
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
                .Select(x => new SaleReturnListDto
                {
                    Id = x.Id,
                    ReturnNumber = x.ReturnNumber,
                    ReturnDate = x.ReturnDate,
                    SaleId = x.SaleId,
                    SaleInvoiceNumber = x.Sale!.InvoiceNumber,
                    CustomerId = x.Sale!.CustomerId,
                    CustomerName = x.Sale!.Customer.FirstName + " " + x.Sale!.Customer.LastName,
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
            res.Message = "لیست مرجوعی‌های فروش با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
