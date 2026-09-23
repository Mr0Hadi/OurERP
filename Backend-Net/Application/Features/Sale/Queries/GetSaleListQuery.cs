using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Application.Features.Sale.Dtos;
using Application.Features.SaleInstallment.Mappings;
using Common.Extensions;
using Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Sale.Queries
{
    public enum SaleListSortEnum
    {
        ID = 0,
        INVOICE_NUMBER = 1,
        CUSTOMER_NAME = 2,
        INVOICE_DATE = 3,
        PAYMENT_DATE = 4,
        STATUS = 5,
        PAYMENT_TYPE = 6,
        TOTAL_AMOUNT = 7,
        PAID_AMOUNT = 8,
    }

    public class GetSaleListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        public string? InvoiceNumber { get; set; }
        public string? CustomerName { get; set; }
        public SalesStatusEnum? Status { get; set; }
        public PaymentTypeEnum? PaymentType { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public DateTime? FromPaymentDate { get; set; }
        public DateTime? ToPaymentDate { get; set; }
        public SaleListSortEnum? SortBy { get; set; }
        public SortDirectionEnum? SortDirection { get; set; }
    }

    public class GetSaleListQueryHandler : IRequestHandler<GetSaleListQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        public GetSaleListQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }
        public async Task<ResponseDto> Handle(GetSaleListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var query = _context.Sales.AsQueryable();

            if (!string.IsNullOrEmpty(request.InvoiceNumber))
            {
                query = query.Where(x => x.InvoiceNumber.Contains(request.InvoiceNumber));
            }

            if (!string.IsNullOrEmpty(request.CustomerName))
            {
                query = query.Where(x =>
                    (x.Customer.FirstName + " " + x.Customer.LastName).Contains(request.CustomerName));
            }

            if (request.Status.HasValue)
            {
                query = query.Where(x => x.Status == request.Status.Value);
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
                SaleListSortEnum.INVOICE_NUMBER => query.SortBy(x => x.InvoiceNumber, direction),
                SaleListSortEnum.CUSTOMER_NAME => query.SortBy(x => x.Customer.FirstName + " " + x.Customer.LastName, direction),
                SaleListSortEnum.INVOICE_DATE => query.SortBy(x => x.InvoiceDate, direction),
                SaleListSortEnum.PAYMENT_DATE => query.SortBy(x => x.PaymentDate, direction),
                SaleListSortEnum.STATUS => query.SortBy(x => x.Status, direction),
                SaleListSortEnum.PAYMENT_TYPE => query.SortBy(x => x.PaymentType, direction),
                SaleListSortEnum.TOTAL_AMOUNT => query.SortBy(x => x.TotalAmount, direction),
                SaleListSortEnum.PAID_AMOUNT => query.SortBy(x => x.PaidAmount, direction),
                _ => query.SortBy(x => x.Id, direction),
            };

            var paged = await sorted.ThenSortBy(x => x.Id, direction).Select(x => new SaleListDto
            {
                Id = x.Id,
                InvoiceNumber = x.InvoiceNumber,
                CustomerId = x.CustomerId,
                CustomerName = x.Customer.FirstName + " " + x.Customer.LastName,
                InvoiceDate = x.InvoiceDate,
                PaymentDate = x.PaymentDate,
                Status = x.Status,
                PaymentType = x.PaymentType,
                TotalAmount = x.TotalAmount,
                PaidAmount = x.PaidAmount
            }).ToPagedAsync(request.Page, request.Take, cancellationToken);

            // خلاصه‌ی اقساط برای کل صفحه در یک round-trip، بعد از materialize شدن صفحه -
            // همان جایی و به همان دلیلی که امضای URL تصاویر در بقیه‌ی لیست‌ها انجام می‌شود.
            var summaries = await SaleInstallmentSummaryReader.ReadForSalesAsync(
                _context, paged.Items.Select(x => x.Id).ToList(), cancellationToken);
            foreach (var item in paged.Items)
            {
                if (summaries.TryGetValue(item.Id, out var summary))
                    item.InstallmentSummary = summary;
            }

            res.Data = new
            {
                SaleList = paged.Items,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = paged.PageCount,
                    Take = request.Take,
                    Total = paged.TotalCount
                }
            };
            res.Message = "لیست فروش‌ sها با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
