using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Purchase.Dtos;
using Common.Extensions;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Purchase.Queries
{
    public class GetReceivePurchaseListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        public string? InvoiceNumber { get; set; }
        public int? SupplierId { get; set; }
        public PaymentTypeEnum? PaymentType { get; set; }
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

            var query = _context.Purchases.Where(x => x.Status == PurchaseStatusEnum.SHIPPED).AsQueryable();

            if (!string.IsNullOrEmpty(request.InvoiceNumber))
            {
                query = query.Where(x => x.InvoiceNumber.Contains(request.InvoiceNumber));
            }

            if (request.SupplierId.HasValue)
            {
                query = query.Where(x => x.SupplierId == request.SupplierId.Value);
            }

            if (request.PaymentType.HasValue)
            {
                query = query.Where(x => x.PaymentType == request.PaymentType.Value);
            }

            if (request.FromDate.HasValue)
            {
                query = query.Where(x => x.InvoiceDate >= request.FromDate.Value);
            }
            
            if (request.ToDate.HasValue)
            {
                query = query.Where(x => x.InvoiceDate <= request.ToDate.Value);
            }

            var data = await query.Select(x => new PurchaseListDto
            {
                Id = x.Id,
                InvoiceDate = x.InvoiceDate,
                InvoiceNumber = x.InvoiceNumber,
                PaidAmount = x.PaidAmount,
                TotalAmount = x.TotalAmount,
                Status = x.Status,
                SupplierId = x.SupplierId,
                PaymentType = x.PaymentType,
                SupplierName = x.Supplier.FirstName + " " + x.Supplier.LastName,
            }).ToPaged(request.Page, request.Take, out int pageCount, out int totalCount).ToListAsync();

            res.Data = new
            {
                PurchaseList = data,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = pageCount,
                    Take = request.Take,
                    Total = totalCount
                }
            };
            res.Message = "لیست خریدها با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
