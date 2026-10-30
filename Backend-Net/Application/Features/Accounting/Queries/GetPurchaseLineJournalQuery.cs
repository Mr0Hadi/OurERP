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
    public enum PurchaseLineJournalSortEnum
    {
        INVOICE_DATE = 0,
        INVOICE_NUMBER = 1,
        PRODUCT_NAME = 2,
        QUANTITY = 3,
        NET_AMOUNT = 4,
        TOTAL_AMOUNT = 5,
    }

    /// <summary>
    /// Every line of the purchase invoices (ریز اقلام خرید), the mirror of GetSaleLineJournal (frontend-requests 21.3):
    /// product, quantity, price, discount and tax as stored on the line, supplement lines included.
    /// Deliberately carries no cost of goods or profit - that is the separate costing feature. Issued invoices only by default.
    /// </summary>
    public class GetPurchaseLineJournalQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;

        /// <summary>On the purchase's InvoiceDate, both days inclusive.</summary>
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }

        /// <summary>Empty = every issued status (everything except PROFORMA and CANCELLED).</summary>
        public List<PurchaseStatusEnum>? Statuses { get; set; }
        public int? PurchaseId { get; set; }
        public int? SupplierId { get; set; }
        public int? ProductId { get; set; }
        public int? ProductCategoryId { get; set; }
        public TaxCategoryEnum? TaxCategory { get; set; }

        /// <summary>Invoice number, supplier name, product name or product code, contains.</summary>
        public string? Search { get; set; }

        public PurchaseLineJournalSortEnum? SortBy { get; set; }
        public SortDirectionEnum? SortDirection { get; set; }
    }

    public class GetPurchaseLineJournalQueryValidator : AbstractValidator<GetPurchaseLineJournalQuery>
    {
        public GetPurchaseLineJournalQueryValidator()
        {
            RuleFor(x => x.ToDate).GreaterThanOrEqualTo(x => x.FromDate).When(x => x.FromDate.HasValue && x.ToDate.HasValue)
                .WithMessage("تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.");
        }
    }

    public class GetPurchaseLineJournalQueryHandler : IRequestHandler<GetPurchaseLineJournalQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetPurchaseLineJournalQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        /// <summary>The filtered lines, unordered - shared with the export.</summary>
        public static IQueryable<PurchaseLineJournalRowDto> Build(IWMSDbContext context, GetPurchaseLineJournalQuery request)
        {
            var query = context.PurchaseItems.Where(x => x.Purchase.IsActive);

            if (request.Statuses is { Count: > 0 })
                query = query.Where(x => request.Statuses.Contains(x.Purchase.Status));
            else
                query = query.Where(x => x.Purchase.Status != PurchaseStatusEnum.PROFORMA && x.Purchase.Status != PurchaseStatusEnum.CANCELLED);

            var from = DateRange.Start(request.FromDate);
            var to = DateRange.EndExclusive(request.ToDate);
            if (from.HasValue)
                query = query.Where(x => x.Purchase.InvoiceDate >= from);
            if (to.HasValue)
                query = query.Where(x => x.Purchase.InvoiceDate < to);

            if (request.PurchaseId.HasValue)
                query = query.Where(x => x.PurchaseId == request.PurchaseId);
            if (request.SupplierId.HasValue)
                query = query.Where(x => x.Purchase.SupplierId == request.SupplierId);
            if (request.ProductId.HasValue)
                query = query.Where(x => x.ProductId == request.ProductId);
            if (request.ProductCategoryId.HasValue)
                query = query.Where(x => x.Product.ProductCategoryId == request.ProductCategoryId);
            if (request.TaxCategory.HasValue)
                query = query.Where(x => x.TaxCategory == request.TaxCategory);

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var search = request.Search.Trim();
                query = query.Where(x => x.Purchase.InvoiceNumber.Contains(search)
                    || x.Purchase.Supplier.CompanyName.Contains(search)
                    || x.Product.Name.Contains(search)
                    || x.Product.Code.Contains(search));
            }

            return query.Select(x => new PurchaseLineJournalRowDto
            {
                Id = x.Id,
                PurchaseId = x.PurchaseId,
                InvoiceNumber = x.Purchase.InvoiceNumber,
                InvoiceDate = x.Purchase.InvoiceDate,
                Status = x.Purchase.Status,
                SupplierId = x.Purchase.SupplierId,
                SupplierName = x.Purchase.Supplier.CompanyName,
                ProductId = x.ProductId,
                ProductCode = x.Product.Code,
                ProductName = x.Product.Name,
                ProductCategoryId = x.Product.ProductCategoryId,
                ProductCategoryName = x.Product.ProductCategory.Name,
                Unit = x.Product.Unit,
                Quantity = x.Quantity,
                ReceivedQuantity = x.ReceivedQuantity,
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

        public static IOrderedQueryable<PurchaseLineJournalRowDto> Sort(IQueryable<PurchaseLineJournalRowDto> query, PurchaseLineJournalSortEnum? sortBy, SortDirectionEnum? sortDirection)
        {
            // Default: newest invoice first.
            var direction = SortingExtensions.ResolveDirection(sortBy.HasValue, sortDirection, SortDirectionEnum.DESC);
            var sorted = sortBy switch
            {
                PurchaseLineJournalSortEnum.INVOICE_NUMBER => query.SortBy(x => x.InvoiceNumber, direction),
                PurchaseLineJournalSortEnum.PRODUCT_NAME => query.SortBy(x => x.ProductName, direction),
                PurchaseLineJournalSortEnum.QUANTITY => query.SortBy(x => x.Quantity, direction),
                PurchaseLineJournalSortEnum.NET_AMOUNT => query.SortBy(x => x.NetAmount, direction),
                PurchaseLineJournalSortEnum.TOTAL_AMOUNT => query.SortBy(x => x.TotalAmount, direction),
                _ => query.SortBy(x => x.InvoiceDate, direction),
            };
            return sorted.ThenSortBy(x => x.Id, direction);
        }

        public async Task<ResponseDto> Handle(GetPurchaseLineJournalQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var query = Build(_context, request);

            var summary = await query
                .GroupBy(x => 1)
                .Select(g => new PurchaseLineJournalSummaryDto
                {
                    Count = g.Count(),
                    Quantity = g.Sum(x => x.Quantity),
                    GrossAmount = g.Sum(x => x.GrossAmount),
                    DiscountAmount = g.Sum(x => x.DiscountAmount),
                    NetAmount = g.Sum(x => x.NetAmount),
                    TaxAmount = g.Sum(x => x.TaxAmount),
                    TotalAmount = g.Sum(x => x.TotalAmount),
                })
                .FirstOrDefaultAsync(cancellationToken) ?? new PurchaseLineJournalSummaryDto();

            var paged = await Sort(query, request.SortBy, request.SortDirection).ToPagedAsync(request.Page, request.Take, cancellationToken);

            res.Data = new
            {
                PurchaseLineJournal = paged.Items,
                Summary = summary,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = paged.PageCount,
                    Take = request.Take,
                    Total = paged.TotalCount
                }
            };
            res.Message = "ریز اقلام خرید با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
