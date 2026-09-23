using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Application.Features.Purchase.Dtos;
using Common.Extensions;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Purchase.Queries
{
    public enum PurchaseListSortEnum
    {
        ID = 0,
        INVOICE_NUMBER = 1,
        SUPPLIER_NAME = 2,
        INVOICE_DATE = 3,
        PAYMENT_DATE = 4,
        STATUS = 5,
        PAYMENT_TYPE = 6,
        TOTAL_AMOUNT = 7,
        PAID_AMOUNT = 8,
    }

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
        public PurchaseListSortEnum? SortBy { get; set; }
        public SortDirectionEnum? SortDirection { get; set; }
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

            // Default: newest first.
            var direction = SortingExtensions.ResolveDirection(request.SortBy.HasValue, request.SortDirection, SortDirectionEnum.DESC);
            var sorted = request.SortBy switch
            {
                PurchaseListSortEnum.INVOICE_NUMBER => query.SortBy(x => x.InvoiceNumber, direction),
                PurchaseListSortEnum.SUPPLIER_NAME => query.SortBy(x => x.Supplier.CompanyName, direction),
                PurchaseListSortEnum.INVOICE_DATE => query.SortBy(x => x.InvoiceDate, direction),
                PurchaseListSortEnum.PAYMENT_DATE => query.SortBy(x => x.PaymentDate, direction),
                PurchaseListSortEnum.STATUS => query.SortBy(x => x.Status, direction),
                PurchaseListSortEnum.PAYMENT_TYPE => query.SortBy(x => x.PaymentType, direction),
                PurchaseListSortEnum.TOTAL_AMOUNT => query.SortBy(x => x.TotalAmount, direction),
                PurchaseListSortEnum.PAID_AMOUNT => query.SortBy(x => x.PaidAmount, direction),
                _ => query.SortBy(x => x.Id, direction),
            };

            var paged = await sorted.ThenSortBy(x => x.Id, direction).Select(x => new PurchaseListDto
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
