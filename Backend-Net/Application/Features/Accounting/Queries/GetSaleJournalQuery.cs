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
    public enum SaleJournalSortEnum
    {
        INVOICE_DATE = 0,
        INVOICE_NUMBER = 1,
        CUSTOMER_NAME = 2,
        DUE_DATE = 3,
        TOTAL_AMOUNT = 4,
        PAID_AMOUNT = 5,
        REMAINING_AMOUNT = 6,
    }

    /// <summary>
    /// The sales journal (دفتر فروش): one row per sale invoice with its line amounts, tax, installment charge, what was
    /// paid and what is left, plus the totals of every invoice matching the filter. Issued invoices only by default.
    /// </summary>
    public class GetSaleJournalQuery : IRequest<ResponseDto>
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
        public List<SalesStatusEnum>? Statuses { get; set; }
        public int? CustomerId { get; set; }
        public int? SalesUserId { get; set; }
        public PaymentTypeEnum? PaymentType { get; set; }
        public InvoicePaymentStateEnum? PaymentState { get; set; }

        /// <summary>Invoice number or customer name, contains.</summary>
        public string? Search { get; set; }

        public SaleJournalSortEnum? SortBy { get; set; }
        public SortDirectionEnum? SortDirection { get; set; }
    }

    public class GetSaleJournalQueryValidator : AbstractValidator<GetSaleJournalQuery>
    {
        public GetSaleJournalQueryValidator()
        {
            RuleFor(x => x.ToDate).GreaterThanOrEqualTo(x => x.FromDate).When(x => x.FromDate.HasValue && x.ToDate.HasValue)
                .WithMessage("تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.");
            RuleFor(x => x.ToDueDate).GreaterThanOrEqualTo(x => x.FromDueDate).When(x => x.FromDueDate.HasValue && x.ToDueDate.HasValue)
                .WithMessage("پایان بازه‌ی سررسید نمی‌تواند قبل از شروع آن باشد.");
        }
    }

    public class GetSaleJournalQueryHandler : IRequestHandler<GetSaleJournalQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetSaleJournalQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        /// <summary>The filtered rows, unordered - shared with the export.</summary>
        public static IQueryable<SaleJournalRowDto> Build(IWMSDbContext context, GetSaleJournalQuery request, DateTime today)
        {
            var query = AccountingDocuments.SaleRows(context);

            if (request.Statuses is { Count: > 0 })
                query = query.Where(x => request.Statuses.Contains(x.Status));
            else
                query = query.Where(x => x.Status != SalesStatusEnum.PROFORMA && x.Status != SalesStatusEnum.CANCELLED);

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

            if (request.CustomerId.HasValue)
                query = query.Where(x => x.CustomerId == request.CustomerId);
            if (request.SalesUserId.HasValue)
                query = query.Where(x => x.SalesUserId == request.SalesUserId);
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
                query = query.Where(x => x.InvoiceNumber.Contains(search) || x.CustomerName.Contains(search));
            }

            return query;
        }

        public static IOrderedQueryable<SaleJournalRowDto> Sort(IQueryable<SaleJournalRowDto> query, SaleJournalSortEnum? sortBy, SortDirectionEnum? sortDirection)
        {
            // Default: newest invoice first.
            var direction = SortingExtensions.ResolveDirection(sortBy.HasValue, sortDirection, SortDirectionEnum.DESC);
            var sorted = sortBy switch
            {
                SaleJournalSortEnum.INVOICE_NUMBER => query.SortBy(x => x.InvoiceNumber, direction),
                SaleJournalSortEnum.CUSTOMER_NAME => query.SortBy(x => x.CustomerName, direction),
                SaleJournalSortEnum.DUE_DATE => query.SortBy(x => x.DueDate, direction),
                SaleJournalSortEnum.TOTAL_AMOUNT => query.SortBy(x => x.TotalAmount, direction),
                SaleJournalSortEnum.PAID_AMOUNT => query.SortBy(x => x.PaidAmount, direction),
                SaleJournalSortEnum.REMAINING_AMOUNT => query.SortBy(x => x.RemainingAmount, direction),
                _ => query.SortBy(x => x.InvoiceDate, direction),
            };
            return sorted.ThenSortBy(x => x.Id, direction);
        }

        /// <summary>Totals of every row in <paramref name="query"/> - the journal footer, and the dashboard's period figures.</summary>
        public static async Task<JournalSummaryDto> SummarizeAsync(IQueryable<SaleJournalRowDto> query, CancellationToken cancellationToken) =>
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
                    InstallmentChargeAmount = g.Sum(x => x.InstallmentChargeAmount),
                    PayableAmount = g.Sum(x => x.PayableAmount),
                    PaidAmount = g.Sum(x => x.PaidAmount),
                    RemainingAmount = g.Sum(x => x.RemainingAmount > 0 ? x.RemainingAmount : 0m),
                })
                .FirstOrDefaultAsync(cancellationToken) ?? new JournalSummaryDto();

        public async Task<ResponseDto> Handle(GetSaleJournalQuery request, CancellationToken cancellationToken)
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
                SaleJournal = paged.Items,
                Summary = summary,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = paged.PageCount,
                    Take = request.Take,
                    Total = paged.TotalCount
                }
            };
            res.Message = "دفتر فروش با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
