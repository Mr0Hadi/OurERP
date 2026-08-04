using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.PurchaseReceiving.Dtos;
using Application.Features.PurchaseReturn;
using Common.Extensions;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.PurchaseReceiving.Queries
{
    public class GetReceivePurchaseListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        public string? Search { get; set; }
        public int? SupplierId { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
    }

    public class GetReceivePurchaseListQueryHandler : IRequestHandler<GetReceivePurchaseListQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetReceivePurchaseListQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetReceivePurchaseListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var query = _context.Purchases
                .Include(x => x.Supplier)
                .Include(x => x.Items)
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

            var pageData = await query
                .OrderByDescending(x => x.InvoiceDate)
                .Select(x => new
                {
                    Purchase = x,
                    x.Id,
                })
                .ToPaged(request.Page, request.Take, out int pageCount, out int totalCount)
                .ToListAsync(cancellationToken);

            var purchaseIds = pageData.Select(x => x.Id).ToList();
            var returns = await _context.PurchaseReturns
                .Include(x => x.Items)
                .ThenInclude(x => x.Decisions)
                .Where(x => purchaseIds.Contains(x.PurchaseId) && x.IsActive)
                .ToListAsync(cancellationToken);

            var data = pageData.Select(p =>
            {
                var purchaseReturn = returns.FirstOrDefault(r => r.PurchaseId == p.Id);
                return new ReceivePurchaseListDto
                {
                    Id = p.Purchase.Id,
                    InvoiceNumber = p.Purchase.InvoiceNumber,
                    InvoiceDate = p.Purchase.InvoiceDate,
                    Status = p.Purchase.Status,
                    SupplierId = p.Purchase.SupplierId,
                    SupplierName = p.Purchase.Supplier.CompanyName,
                    TotalAmount = p.Purchase.TotalAmount,
                    PaidAmount = p.Purchase.PaidAmount,
                    PaymentType = p.Purchase.PaymentType,
                    Items = (p.Purchase.Items ?? new List<Domain.Entities.PurchaseItem>())
                        .Where(i => i.IsActive)
                        .Select(i => new ReceivePurchaseListItemDto
                        {
                            Id = i.Id,
                            ProductId = i.ProductId,
                            ProductCode = i.Product.Code,
                            ProductName = i.Product.Name,
                            Unit = i.Product.Unit.GetDescription(),
                            OrderedQty = i.Quantity,
                            ReceivedQuantity = i.ReceivedQuantity,
                            ReceivableQty = PurchaseReturnStatusUpdater.ComputeReceivableQuantity(i, purchaseReturn),
                            UnitPrice = i.UnitPrice,
                            Discount = i.Discount,
                        }).ToList(),
                };
            }).ToList();

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
