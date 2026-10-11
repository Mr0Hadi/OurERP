using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Application.Features.Accounting.Dtos;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Accounting.Queries
{
    public enum SaleLineJournalSortEnum
    {
        INVOICE_DATE = 0,
        INVOICE_NUMBER = 1,
        PRODUCT_NAME = 2,
        QUANTITY = 3,
        NET_AMOUNT = 4,
        TOTAL_AMOUNT = 5,
    }

    /// <summary>
    /// Every line of the sale invoices (ریز اقلام فروش): product, quantity, price, discount and tax as stored on the line.
    /// Deliberately carries no cost of goods or profit - that is the separate costing feature. Issued invoices only by default.
    /// </summary>
    public class GetSaleLineJournalQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;

        /// <summary>On the sale's InvoiceDate, both days inclusive.</summary>
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }

        /// <summary>Empty = every issued status (everything except PROFORMA and CANCELLED).</summary>
        public List<SalesStatusEnum>? Statuses { get; set; }
        public int? SaleId { get; set; }
        public int? CustomerId { get; set; }
        public int? ProductId { get; set; }
        public int? ProductCategoryId { get; set; }
        public TaxCategoryEnum? TaxCategory { get; set; }

        /// <summary>Invoice number, customer name, product name or product code, contains.</summary>
        public string? Search { get; set; }

        public SaleLineJournalSortEnum? SortBy { get; set; }
        public SortDirectionEnum? SortDirection { get; set; }
    }

    public class GetSaleLineJournalQueryValidator : AbstractValidator<GetSaleLineJournalQuery>
    {
        public GetSaleLineJournalQueryValidator()
        {
            RuleFor(x => x.ToDate).GreaterThanOrEqualTo(x => x.FromDate).When(x => x.FromDate.HasValue && x.ToDate.HasValue)
                .WithMessage("تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.");
        }
    }

    public class GetSaleLineJournalQueryHandler : IRequestHandler<GetSaleLineJournalQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetSaleLineJournalQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        /// <summary>The filtered lines, unordered - shared with the export.</summary>
        public static IQueryable<SaleLineJournalRowDto> Build(IWMSDbContext context, GetSaleLineJournalQuery request)
        {
            var query = context.SaleItems.Where(x => x.Sale.IsActive);

            if (request.Statuses is { Count: > 0 })
                query = query.Where(x => request.Statuses.Contains(x.Sale.Status));
            else
                query = query.Where(x => x.Sale.Status != SalesStatusEnum.PROFORMA && x.Sale.Status != SalesStatusEnum.CANCELLED);

            var from = DateRange.Start(request.FromDate);
            var to = DateRange.EndExclusive(request.ToDate);
            if (from.HasValue)
                query = query.Where(x => x.Sale.InvoiceDate >= from);
            if (to.HasValue)
                query = query.Where(x => x.Sale.InvoiceDate < to);

            if (request.SaleId.HasValue)
                query = query.Where(x => x.SaleId == request.SaleId);
            if (request.CustomerId.HasValue)
                query = query.Where(x => x.Sale.CustomerId == request.CustomerId);
            if (request.ProductId.HasValue)
                query = query.Where(x => x.ProductId == request.ProductId);
            if (request.ProductCategoryId.HasValue)
                query = query.Where(x => x.Product.ProductCategoryId == request.ProductCategoryId);
            if (request.TaxCategory.HasValue)
                query = query.Where(x => x.TaxCategory == request.TaxCategory);

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var search = request.Search.Trim();
                query = query.Where(x => x.Sale.InvoiceNumber.Contains(search)
                    || (x.Sale.Customer.FirstName + " " + x.Sale.Customer.LastName).Contains(search)
                    || x.Product.Name.Contains(search)
                    || x.Product.Code.Contains(search));
            }

            return query.Select(x => new SaleLineJournalRowDto
            {
                Id = x.Id,
                SaleId = x.SaleId,
                InvoiceNumber = x.Sale.InvoiceNumber,
                InvoiceDate = x.Sale.InvoiceDate,
                Status = x.Sale.Status,
                CustomerId = x.Sale.CustomerId,
                CustomerName = x.Sale.Customer.FirstName + " " + x.Sale.Customer.LastName,
                ProductId = x.ProductId,
                ProductCode = x.Product.Code,
                ProductName = x.Product.Name,
                ProductCategoryId = x.Product.ProductCategoryId,
                ProductCategoryName = x.Product.ProductCategory.Name,
                Unit = x.Product.Unit,
                Quantity = x.Quantity,
                ShippedQuantity = x.ShippedQuantity,
                UnitPrice = (decimal)x.UnitPrice,
                DiscountPercent = x.Discount,
                GrossAmount = (decimal)x.GrossAmount,
                DiscountAmount = (decimal)x.DiscountAmount,
                NetAmount = (decimal)x.NetAmount,
                TaxCategory = x.TaxCategory,
                TaxPercent = x.TaxPercent,
                TaxAmount = (decimal)x.TaxAmount,
                TotalAmount = (decimal)x.TotalAmount,
            });
        }

        public static IOrderedQueryable<SaleLineJournalRowDto> Sort(IQueryable<SaleLineJournalRowDto> query, SaleLineJournalSortEnum? sortBy, SortDirectionEnum? sortDirection)
        {
            // Default: newest invoice first.
            var direction = SortingExtensions.ResolveDirection(sortBy.HasValue, sortDirection, SortDirectionEnum.DESC);
            var sorted = sortBy switch
            {
                SaleLineJournalSortEnum.INVOICE_NUMBER => query.SortBy(x => x.InvoiceNumber, direction),
                SaleLineJournalSortEnum.PRODUCT_NAME => query.SortBy(x => x.ProductName, direction),
                SaleLineJournalSortEnum.QUANTITY => query.SortBy(x => x.Quantity, direction),
                SaleLineJournalSortEnum.NET_AMOUNT => query.SortBy(x => x.NetAmount, direction),
                SaleLineJournalSortEnum.TOTAL_AMOUNT => query.SortBy(x => x.TotalAmount, direction),
                _ => query.SortBy(x => x.InvoiceDate, direction),
            };
            return sorted.ThenSortBy(x => x.Id, direction);
        }

        public async Task<ResponseDto> Handle(GetSaleLineJournalQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var query = Build(_context, request);

            var summary = await query
                .GroupBy(x => 1)
                .Select(g => new SaleLineJournalSummaryDto
                {
                    Count = g.Count(),
                    Quantity = g.Sum(x => x.Quantity),
                    GrossAmount = g.Sum(x => x.GrossAmount),
                    DiscountAmount = g.Sum(x => x.DiscountAmount),
                    NetAmount = g.Sum(x => x.NetAmount),
                    TaxAmount = g.Sum(x => x.TaxAmount),
                    TotalAmount = g.Sum(x => x.TotalAmount),
                })
                .FirstOrDefaultAsync(cancellationToken) ?? new SaleLineJournalSummaryDto();

            var paged = await Sort(query, request.SortBy, request.SortDirection).ToPagedAsync(request.Page, request.Take, cancellationToken);

            res.Data = new
            {
                SaleLineJournal = paged.Items,
                Summary = summary,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = paged.PageCount,
                    Take = request.Take,
                    Total = paged.TotalCount
                }
            };
            res.Message = "ریز اقلام فروش با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
