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
    public class GetPurchaseListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        public string? InvoiceNumber { get; set; }
        public int? SupplierId { get; set; }
        public PurchaseStatusEnum? Status { get; set; }
        public PaymentTypeEnum? PaymentType { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public DateTime? FromPaymentDate { get; set; }
        public DateTime? ToPaymentDate { get; set; }
    }

    public class GetPurchaseListQueryHandler : IRequestHandler<GetPurchaseListQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        public GetPurchaseListQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }
        public async Task<ResponseDto> Handle(GetPurchaseListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var query = _context.Purchases.AsQueryable();

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

            if (request.Status.HasValue)
            {
                query = query.Where(x => x.Status == request.Status.Value);
            }

            if (request.FromDate.HasValue)
            {
                query = query.Where(x => x.InvoiceDate >= request.FromDate.Value);
            }

            if (request.ToDate.HasValue)
            {
                query = query.Where(x => x.InvoiceDate <= request.ToDate.Value);
            }

            if (request.FromPaymentDate.HasValue)
            {
                query = query.Where(x => x.PaymentDate >= request.FromPaymentDate.Value);
            }

            if (request.ToPaymentDate.HasValue)
            {
                query = query.Where(x => x.PaymentDate <= request.ToPaymentDate.Value);
            }

            var paged = await query.Select(x => new PurchaseListDto
            {
                Id = x.Id,
                InvoiceNumber = x.InvoiceNumber,
                SupplierId = x.SupplierId,
                SupplierName = x.Supplier.CompanyName,
                InvoiceDate = x.InvoiceDate,
                PaymentDate = x.PaymentDate,
                Status = x.Status,
                TotalAmount = x.TotalAmount,
                PaidAmount = x.PaidAmount,
                PaymentType = x.PaymentType,
            }).ToPagedAsync(request.Page, request.Take, cancellationToken);

            res.Data = new
            {
                PurchaseList = paged.Items,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = paged.PageCount,
                    Take = request.Take,
                    Total = paged.TotalCount
                }
            };
            res.Message = "لیست خریدها با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
