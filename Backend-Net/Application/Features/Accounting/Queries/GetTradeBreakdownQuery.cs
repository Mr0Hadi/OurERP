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
    public enum TradeBreakdownSortEnum
    {
        NET_AMOUNT = 0,
        TITLE = 1,
        QUANTITY = 2,
        INVOICE_COUNT = 3,
        TOTAL_AMOUNT = 4,
    }

    /// <summary>
    /// Sales or purchases of a period broken down by product, category, party or user (تفکیک فروش/خرید): quantity, net,
    /// tax and total of the issued invoice lines in each group, and its share of the period's net. Invoice amounts only -
    /// no cost or profit, which belong to the costing feature.
    /// </summary>
    public class GetTradeBreakdownQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;
        public DocumentSideEnum Side { get; set; } = DocumentSideEnum.SALE;
        public TradeBreakdownGroupEnum GroupBy { get; set; } = TradeBreakdownGroupEnum.PRODUCT;

        /// <summary>On InvoiceDate, both days inclusive.</summary>
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }

        /// <summary>The customer (Side = SALE) or supplier (Side = PURCHASE).</summary>
        public int? PartyId { get; set; }
        public int? ProductId { get; set; }
        public int? ProductCategoryId { get; set; }

        /// <summary>Group title (product name/code, category, party or user name), contains.</summary>
        public string? Search { get; set; }

        public TradeBreakdownSortEnum? SortBy { get; set; }
        public SortDirectionEnum? SortDirection { get; set; }
    }

    public class GetTradeBreakdownQueryValidator : AbstractValidator<GetTradeBreakdownQuery>
    {
        public GetTradeBreakdownQueryValidator()
        {
            RuleFor(x => x.Side).IsInEnum().WithMessage("نوع سند معتبر نیست.");
            RuleFor(x => x.GroupBy).IsInEnum().WithMessage("نوع تفکیک معتبر نیست.");
            RuleFor(x => x.ToDate).GreaterThanOrEqualTo(x => x.FromDate).When(x => x.FromDate.HasValue && x.ToDate.HasValue)
                .WithMessage("تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.");
        }
    }

    public class GetTradeBreakdownQueryHandler : IRequestHandler<GetTradeBreakdownQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetTradeBreakdownQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        /// <summary>One issued invoice line of either side, in the shape the grouping reads.</summary>
        private sealed class Line
        {
            public int DocumentId { get; set; }
            public DateTime? InvoiceDate { get; set; }
            public int ProductId { get; set; }
            public string ProductName { get; set; } = string.Empty;
            public string ProductCode { get; set; } = string.Empty;
            public int CategoryId { get; set; }
            public string CategoryName { get; set; } = string.Empty;
            public int PartyId { get; set; }
            public string PartyName { get; set; } = string.Empty;
            public int UserId { get; set; }
            public string UserName { get; set; } = string.Empty;
            public int Quantity { get; set; }
            public decimal Gross { get; set; }
            public decimal Discount { get; set; }
            public decimal Net { get; set; }
            public decimal Tax { get; set; }
            public decimal Total { get; set; }
        }

        private static IQueryable<Line> Lines(IWMSDbContext context, DocumentSideEnum side) => side == DocumentSideEnum.PURCHASE
            ? context.PurchaseItems
                .Where(x => x.Purchase.IsActive && x.Purchase.Status != PurchaseStatusEnum.PROFORMA && x.Purchase.Status != PurchaseStatusEnum.CANCELLED)
                .Select(x => new Line
                {
                    DocumentId = x.PurchaseId,
                    InvoiceDate = x.Purchase.InvoiceDate,
                    ProductId = x.ProductId,
                    ProductName = x.Product.Name,
                    ProductCode = x.Product.Code,
                    CategoryId = x.Product.ProductCategoryId,
                    CategoryName = x.Product.ProductCategory.Name,
                    PartyId = x.Purchase.SupplierId,
                    PartyName = x.Purchase.Supplier.CompanyName,
                    UserId = x.Purchase.PurchasingUserId ?? 0,
                    UserName = x.Purchase.PurchasingUser != null ? x.Purchase.PurchasingUser.FirstName + " " + x.Purchase.PurchasingUser.LastName : "",
                    Quantity = x.Quantity,
                    Gross = (decimal)x.GrossAmount,
                    Discount = (decimal)x.DiscountAmount,
                    Net = (decimal)x.NetAmount,
                    Tax = (decimal)x.TaxAmount,
                    Total = (decimal)x.TotalAmount,
                })
            : context.SaleItems
                .Where(x => x.Sale.IsActive && x.Sale.Status != SalesStatusEnum.PROFORMA && x.Sale.Status != SalesStatusEnum.CANCELLED)
                .Select(x => new Line
                {
                    DocumentId = x.SaleId,
                    InvoiceDate = x.Sale.InvoiceDate,
                    ProductId = x.ProductId,
                    ProductName = x.Product.Name,
                    ProductCode = x.Product.Code,
                    CategoryId = x.Product.ProductCategoryId,
                    CategoryName = x.Product.ProductCategory.Name,
                    PartyId = x.Sale.CustomerId,
                    PartyName = x.Sale.Customer.FirstName + " " + x.Sale.Customer.LastName,
                    UserId = x.Sale.SalesUserId ?? 0,
                    UserName = x.Sale.SalesUser != null ? x.Sale.SalesUser.FirstName + " " + x.Sale.SalesUser.LastName : "",
                    Quantity = x.Quantity,
                    Gross = (decimal)x.GrossAmount,
                    Discount = (decimal)x.DiscountAmount,
                    Net = (decimal)x.NetAmount,
                    Tax = (decimal)x.TaxAmount,
                    Total = (decimal)x.TotalAmount,
                });

        /// <summary>Issued lines of the request's side and period, with its party/product/category filters.</summary>
        private static IQueryable<Line> FilteredLines(IWMSDbContext context, GetTradeBreakdownQuery request)
        {
            var lines = Lines(context, request.Side);
            var from = DateRange.Start(request.FromDate);
            var to = DateRange.EndExclusive(request.ToDate);
            if (from.HasValue)
                lines = lines.Where(x => x.InvoiceDate >= from);
            if (to.HasValue)
                lines = lines.Where(x => x.InvoiceDate < to);
            if (request.PartyId.HasValue)
                lines = lines.Where(x => x.PartyId == request.PartyId);
            if (request.ProductId.HasValue)
                lines = lines.Where(x => x.ProductId == request.ProductId);
            if (request.ProductCategoryId.HasValue)
                lines = lines.Where(x => x.CategoryId == request.ProductCategoryId);
            return lines;
        }

        /// <summary>The groups the table pages and the trade-breakdown export streams (the export without NetSharePercent).</summary>
        public static IQueryable<TradeBreakdownRowDto> Build(IWMSDbContext context, GetTradeBreakdownQuery request) =>
            Groups(FilteredLines(context, request), request);

        private static IQueryable<TradeBreakdownRowDto> Groups(IQueryable<Line> lines, GetTradeBreakdownQuery request)
        {
            var groups = request.GroupBy switch
            {
                TradeBreakdownGroupEnum.CATEGORY => lines.GroupBy(x => new { Id = x.CategoryId, Title = x.CategoryName, Code = (string?)null })
                    .Select(g => new TradeBreakdownRowDto { Id = g.Key.Id, Title = g.Key.Title, Code = g.Key.Code, InvoiceCount = g.Select(x => x.DocumentId).Distinct().Count(), Quantity = g.Sum(x => x.Quantity), GrossAmount = g.Sum(x => x.Gross), DiscountAmount = g.Sum(x => x.Discount), NetAmount = g.Sum(x => x.Net), TaxAmount = g.Sum(x => x.Tax), TotalAmount = g.Sum(x => x.Total) }),
                TradeBreakdownGroupEnum.PARTY => lines.GroupBy(x => new { Id = x.PartyId, Title = x.PartyName, Code = (string?)null })
                    .Select(g => new TradeBreakdownRowDto { Id = g.Key.Id, Title = g.Key.Title, Code = g.Key.Code, InvoiceCount = g.Select(x => x.DocumentId).Distinct().Count(), Quantity = g.Sum(x => x.Quantity), GrossAmount = g.Sum(x => x.Gross), DiscountAmount = g.Sum(x => x.Discount), NetAmount = g.Sum(x => x.Net), TaxAmount = g.Sum(x => x.Tax), TotalAmount = g.Sum(x => x.Total) }),
                TradeBreakdownGroupEnum.USER => lines.GroupBy(x => new { Id = x.UserId, Title = x.UserName, Code = (string?)null })
                    .Select(g => new TradeBreakdownRowDto { Id = g.Key.Id, Title = g.Key.Title, Code = g.Key.Code, InvoiceCount = g.Select(x => x.DocumentId).Distinct().Count(), Quantity = g.Sum(x => x.Quantity), GrossAmount = g.Sum(x => x.Gross), DiscountAmount = g.Sum(x => x.Discount), NetAmount = g.Sum(x => x.Net), TaxAmount = g.Sum(x => x.Tax), TotalAmount = g.Sum(x => x.Total) }),
                _ => lines.GroupBy(x => new { Id = x.ProductId, Title = x.ProductName, Code = (string?)x.ProductCode })
                    .Select(g => new TradeBreakdownRowDto { Id = g.Key.Id, Title = g.Key.Title, Code = g.Key.Code, InvoiceCount = g.Select(x => x.DocumentId).Distinct().Count(), Quantity = g.Sum(x => x.Quantity), GrossAmount = g.Sum(x => x.Gross), DiscountAmount = g.Sum(x => x.Discount), NetAmount = g.Sum(x => x.Net), TaxAmount = g.Sum(x => x.Tax), TotalAmount = g.Sum(x => x.Total) }),
            };

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var search = request.Search.Trim();
                groups = groups.Where(x => x.Title.Contains(search) || x.Code!.Contains(search));
            }
            return groups;
        }

        /// <summary>Default: the biggest net first; always ends on the group id so paging is stable.</summary>
        public static IOrderedQueryable<TradeBreakdownRowDto> Sort(IQueryable<TradeBreakdownRowDto> groups, TradeBreakdownSortEnum? sortBy, SortDirectionEnum? sortDirection)
        {
            var direction = SortingExtensions.ResolveDirection(sortBy.HasValue, sortDirection, SortDirectionEnum.DESC);
            var sorted = sortBy switch
            {
                TradeBreakdownSortEnum.TITLE => groups.SortBy(x => x.Title, direction),
                TradeBreakdownSortEnum.QUANTITY => groups.SortBy(x => x.Quantity, direction),
                TradeBreakdownSortEnum.INVOICE_COUNT => groups.SortBy(x => x.InvoiceCount, direction),
                TradeBreakdownSortEnum.TOTAL_AMOUNT => groups.SortBy(x => x.TotalAmount, direction),
                _ => groups.SortBy(x => x.NetAmount, direction),
            };
            return sorted.ThenSortBy(x => x.Id, direction);
        }

        public async Task<ResponseDto> Handle(GetTradeBreakdownQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var lines = FilteredLines(_context, request);
            var groups = Groups(lines, request);

            // The totals of the period (before the title search, so a share is always of the whole period).
            var totals = await lines
                .GroupBy(x => 1)
                .Select(g => new TradeBreakdownSummaryDto
                {
                    InvoiceCount = g.Select(x => x.DocumentId).Distinct().Count(),
                    Quantity = g.Sum(x => x.Quantity),
                    GrossAmount = g.Sum(x => x.Gross),
                    DiscountAmount = g.Sum(x => x.Discount),
                    NetAmount = g.Sum(x => x.Net),
                    TaxAmount = g.Sum(x => x.Tax),
                    TotalAmount = g.Sum(x => x.Total),
                })
                .FirstOrDefaultAsync(cancellationToken) ?? new TradeBreakdownSummaryDto();
            totals.GroupCount = await groups.CountAsync(cancellationToken);

            var sorted = Sort(groups, request.SortBy, request.SortDirection);

            var paged = await sorted.ToPagedAsync(request.Page, request.Take, cancellationToken);
            foreach (var row in paged.Items)
                row.NetSharePercent = totals.NetAmount == 0 ? 0 : Math.Round(row.NetAmount * 100m / totals.NetAmount, 2);

            res.Data = new
            {
                TradeBreakdown = paged.Items,
                Summary = totals,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = paged.PageCount,
                    Take = request.Take,
                    Total = paged.TotalCount
                }
            };
            res.Message = "تفکیک خرید و فروش با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
