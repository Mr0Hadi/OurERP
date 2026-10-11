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
    public enum PurchaseJournalSortEnum
    {
        INVOICE_DATE = 0,
        INVOICE_NUMBER = 1,
        SUPPLIER_NAME = 2,
        DUE_DATE = 3,
        TOTAL_AMOUNT = 4,
        PAID_AMOUNT = 5,
        REMAINING_AMOUNT = 6,
    }

    /// <summary>
    /// The purchase journal (دفتر خرید): one row per purchase invoice with its line amounts, tax, the share closed short,
    /// what we paid and what we still owe, plus the totals of every invoice matching the filter. Recorded invoices only
    /// by default.
    /// </summary>
    public class GetPurchaseJournalQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;

        /// <summary>On InvoiceDate, both days inclusive.</summary>
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }

        /// <summary>On the due date (PaymentDate, else InvoiceDate), both days inclusive.</summary>
        public DateTime? FromDueDate { get; set; }
        public DateTime? ToDueDate { get; set; }

        /// <summary>Empty = every issued status (everything except PROFORMA and CANCELLED). Send them explicitly to see them.</summary>
        public List<PurchaseStatusEnum>? Statuses { get; set; }
        public int? SupplierId { get; set; }
        public int? PurchasingUserId { get; set; }
        public PaymentTypeEnum? PaymentType { get; set; }
        public InvoicePaymentStateEnum? PaymentState { get; set; }

        /// <summary>Invoice number or supplier company name, contains.</summary>
        public string? Search { get; set; }

        public PurchaseJournalSortEnum? SortBy { get; set; }
        public SortDirectionEnum? SortDirection { get; set; }
    }

    public class GetPurchaseJournalQueryValidator : AbstractValidator<GetPurchaseJournalQuery>
    {
        public GetPurchaseJournalQueryValidator()
        {
            RuleFor(x => x.ToDate).GreaterThanOrEqualTo(x => x.FromDate).When(x => x.FromDate.HasValue && x.ToDate.HasValue)
                .WithMessage("تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.");
            RuleFor(x => x.ToDueDate).GreaterThanOrEqualTo(x => x.FromDueDate).When(x => x.FromDueDate.HasValue && x.ToDueDate.HasValue)
                .WithMessage("پایان بازه‌ی سررسید نمی‌تواند قبل از شروع آن باشد.");
        }
    }

    public class GetPurchaseJournalQueryHandler : IRequestHandler<GetPurchaseJournalQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetPurchaseJournalQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        /// <summary>The filtered rows, unordered - shared with the export.</summary>
        public static IQueryable<PurchaseJournalRowDto> Build(IWMSDbContext context, GetPurchaseJournalQuery request, DateTime today)
        {
            var query = AccountingDocuments.PurchaseRows(context);

            if (request.Statuses is { Count: > 0 })
                query = query.Where(x => request.Statuses.Contains(x.Status));
            else
                query = query.Where(x => x.Status != PurchaseStatusEnum.PROFORMA && x.Status != PurchaseStatusEnum.CANCELLED);

            var from = DateRange.Start(request.FromDate);
            var to = DateRange.EndExclusive(request.ToDate);
            if (from.HasValue)
                query = query.Where(x => x.InvoiceDate >= from);
            if (to.HasValue)
                query = query.Where(x => x.InvoiceDate < to);

            var dueFrom = DateRange.Start(request.FromDueDate);
            var dueTo = DateRange.EndExclusive(request.ToDueDate);
            if (dueFrom.HasValue)
                query = query.Where(x => x.DueDate >= dueFrom);
            if (dueTo.HasValue)
                query = query.Where(x => x.DueDate < dueTo);

            if (request.SupplierId.HasValue)
                query = query.Where(x => x.SupplierId == request.SupplierId);
            if (request.PurchasingUserId.HasValue)
                query = query.Where(x => x.PurchasingUserId == request.PurchasingUserId);
            if (request.PaymentType.HasValue)
                query = query.Where(x => x.PaymentType == request.PaymentType);

            var todayStart = today.Date;
            query = request.PaymentState switch
            {
                InvoicePaymentStateEnum.OPEN => query.Where(x => x.RemainingAmount > 0),
                InvoicePaymentStateEnum.SETTLED => query.Where(x => x.RemainingAmount <= 0),
                InvoicePaymentStateEnum.OVERDUE => query.Where(x => x.RemainingAmount > 0 && x.DueDate < todayStart),
                _ => query,
            };

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var search = request.Search.Trim();
                query = query.Where(x => x.InvoiceNumber.Contains(search) || x.SupplierName.Contains(search));
            }

            return query;
        }

        public static IOrderedQueryable<PurchaseJournalRowDto> Sort(IQueryable<PurchaseJournalRowDto> query, PurchaseJournalSortEnum? sortBy, SortDirectionEnum? sortDirection)
        {
            // Default: newest invoice first.
            var direction = SortingExtensions.ResolveDirection(sortBy.HasValue, sortDirection, SortDirectionEnum.DESC);
            var sorted = sortBy switch
            {
                PurchaseJournalSortEnum.INVOICE_NUMBER => query.SortBy(x => x.InvoiceNumber, direction),
                PurchaseJournalSortEnum.SUPPLIER_NAME => query.SortBy(x => x.SupplierName, direction),
                PurchaseJournalSortEnum.DUE_DATE => query.SortBy(x => x.DueDate, direction),
                PurchaseJournalSortEnum.TOTAL_AMOUNT => query.SortBy(x => x.TotalAmount, direction),
                PurchaseJournalSortEnum.PAID_AMOUNT => query.SortBy(x => x.PaidAmount, direction),
                PurchaseJournalSortEnum.REMAINING_AMOUNT => query.SortBy(x => x.RemainingAmount, direction),
                _ => query.SortBy(x => x.InvoiceDate, direction),
            };
            return sorted.ThenSortBy(x => x.Id, direction);
        }

        /// <summary>Totals of every row in <paramref name="query"/> - the journal footer, and the dashboard's period figures.</summary>
        public static async Task<JournalSummaryDto> SummarizeAsync(IQueryable<PurchaseJournalRowDto> query, CancellationToken cancellationToken) =>
            await query
                .GroupBy(x => 1)
                .Select(g => new JournalSummaryDto
                {
                    Count = g.Count(),
                    GrossAmount = g.Sum(x => x.GrossAmount),
                    DiscountAmount = g.Sum(x => x.DiscountAmount),
                    NetAmount = g.Sum(x => x.NetAmount),
                    TaxAmount = g.Sum(x => x.TaxAmount),
                    TotalAmount = g.Sum(x => x.TotalAmount),
                    ShortClosedAmount = g.Sum(x => x.ShortClosedAmount),
                    PayableAmount = g.Sum(x => x.PayableAmount),
                    PaidAmount = g.Sum(x => x.PaidAmount),
                    RemainingAmount = g.Sum(x => x.RemainingAmount > 0 ? x.RemainingAmount : 0m),
                })
                .FirstOrDefaultAsync(cancellationToken) ?? new JournalSummaryDto();

        public async Task<ResponseDto> Handle(GetPurchaseJournalQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var today = DateTime.Now;

            var query = Build(_context, request, today);

            var summary = await SummarizeAsync(query, cancellationToken);

            var paged = await Sort(query, request.SortBy, request.SortDirection).ToPagedAsync(request.Page, request.Take, cancellationToken);
            foreach (var row in paged.Items)
                row.OverdueDays = AccountingDocuments.OverdueDays(row.RemainingAmount, row.DueDate, today);

            res.Data = new
            {
                PurchaseJournal = paged.Items,
                Summary = summary,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = paged.PageCount,
                    Take = request.Take,
                    Total = paged.TotalCount
                }
            };
            res.Message = "دفتر خرید با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
