using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Application.Features.Accounting.Dtos;
using Common.Extensions;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Accounting.Queries
{
    public enum PaymentJournalSortEnum
    {
        PAID_AT = 0,
        RECORDED_AT = 1,
        AMOUNT = 2,
        PARTY_NAME = 3,
    }

    /// <summary>
    /// The receipts-and-payments journal (دفتر دریافت و پرداخت): every payment row of every sale and purchase, installments
    /// included, card reader or not, and (since 2026-10-17) every on-account payment with no invoice. Each row names its cash
    /// box / bank account when it has one; per-account balances are BankAccount/GetBankAccountStatement.
    /// </summary>
    public class GetPaymentJournalQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;

        /// <summary>On PaidAt, both days inclusive.</summary>
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public PaymentDirectionEnum? Direction { get; set; }

        /// <summary>Empty = every method.</summary>
        public List<PaymentTypeEnum>? Types { get; set; }
        public PaymentPurposeEnum? Purpose { get; set; }
        public DocumentSideEnum? DocumentSide { get; set; }
        public int? SaleId { get; set; }
        public int? PurchaseId { get; set; }
        public int? CustomerId { get; set; }
        public int? SupplierId { get; set; }
        public int? PosTerminalId { get; set; }
        public int? RecordedByUserId { get; set; }

        /// <summary>Only rows through this cash box / bank account.</summary>
        public int? BankAccountId { get; set; }

        /// <summary>true = only on-account payments (no invoice), false = only invoice payments.</summary>
        public bool? IsOnAccount { get; set; }

        /// <summary>Voided rows are left out unless asked for; they never count in the summary either way.</summary>
        public bool IncludeVoided { get; set; }

        /// <summary>Invoice number, party name, cheque number or transfer reference, contains.</summary>
        public string? Search { get; set; }

        public PaymentJournalSortEnum? SortBy { get; set; }
        public SortDirectionEnum? SortDirection { get; set; }
    }

    public class GetPaymentJournalQueryValidator : AbstractValidator<GetPaymentJournalQuery>
    {
        public GetPaymentJournalQueryValidator()
        {
            RuleFor(x => x.ToDate).GreaterThanOrEqualTo(x => x.FromDate).When(x => x.FromDate.HasValue && x.ToDate.HasValue)
                .WithMessage("تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.");
        }
    }

    public class GetPaymentJournalQueryHandler : IRequestHandler<GetPaymentJournalQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetPaymentJournalQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        /// <summary>The filtered payment rows (voided ones included only when asked for).</summary>
        public static IQueryable<PaymentDetail> Filter(IWMSDbContext context, GetPaymentJournalQuery request)
        {
            // A payment on a deleted document belongs to nobody's account; an on-account payment belongs to its party's.
            var query = context.PaymentDetails.Where(x => (x.Sale != null && x.Sale.IsActive) || (x.Purchase != null && x.Purchase.IsActive)
                || x.CustomerId != null || x.SupplierId != null);

            if (!request.IncludeVoided)
                query = query.Where(x => x.VoidedAt == null);

            var from = DateRange.Start(request.FromDate);
            var to = DateRange.EndExclusive(request.ToDate);
            if (from.HasValue)
                query = query.Where(x => x.PaidAt >= from);
            if (to.HasValue)
                query = query.Where(x => x.PaidAt < to);

            if (request.Direction.HasValue)
                query = query.Where(x => x.Direction == request.Direction);
            if (request.Types is { Count: > 0 })
                query = query.Where(x => request.Types.Contains(x.Type));
            if (request.Purpose.HasValue)
                query = query.Where(x => x.Purpose == request.Purpose);
            // The side is the party's: an on-account receipt from a customer is on the sale side.
            if (request.DocumentSide == DocumentSideEnum.SALE)
                query = query.Where(x => x.SaleId != null || x.CustomerId != null);
            if (request.DocumentSide == DocumentSideEnum.PURCHASE)
                query = query.Where(x => x.PurchaseId != null || x.SupplierId != null);
            if (request.SaleId.HasValue)
                query = query.Where(x => x.SaleId == request.SaleId);
            if (request.PurchaseId.HasValue)
                query = query.Where(x => x.PurchaseId == request.PurchaseId);
            if (request.CustomerId.HasValue)
                query = query.Where(x => (x.Sale != null && x.Sale.CustomerId == request.CustomerId) || x.CustomerId == request.CustomerId);
            if (request.SupplierId.HasValue)
                query = query.Where(x => (x.Purchase != null && x.Purchase.SupplierId == request.SupplierId) || x.SupplierId == request.SupplierId);
            if (request.BankAccountId.HasValue)
                query = query.Where(x => x.BankAccountId == request.BankAccountId);
            if (request.IsOnAccount == true)
                query = query.Where(x => x.SaleId == null && x.PurchaseId == null);
            if (request.IsOnAccount == false)
                query = query.Where(x => x.SaleId != null || x.PurchaseId != null);
            if (request.PosTerminalId.HasValue)
                query = query.Where(x => x.PosTerminalId == request.PosTerminalId);
            if (request.RecordedByUserId.HasValue)
                query = query.Where(x => x.RecordedByUserId == request.RecordedByUserId);

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var search = request.Search.Trim();
                query = query.Where(x => (x.Sale != null && (x.Sale.InvoiceNumber.Contains(search)
                                              || (x.Sale.Customer.FirstName + " " + x.Sale.Customer.LastName).Contains(search)))
                    || (x.Purchase != null && (x.Purchase.InvoiceNumber.Contains(search) || x.Purchase.Supplier.CompanyName.Contains(search)))
                    || (x.Customer != null && (x.Customer.FirstName + " " + x.Customer.LastName).Contains(search))
                    || (x.Supplier != null && x.Supplier.CompanyName.Contains(search))
                    || x.Description!.Contains(search)
                    || x.CheckNumber!.Contains(search)
                    || x.TransferRef!.Contains(search));
            }

            return query;
        }

        public static IQueryable<PaymentJournalRowDto> Project(IQueryable<PaymentDetail> query) =>
            query.Select(x => new PaymentJournalRowDto
            {
                Id = x.Id,
                PaidAt = x.PaidAt,
                RecordedAt = x.RecordedAt,
                Direction = x.Direction,
                Type = x.Type,
                Purpose = x.Purpose,
                Amount = x.Amount,
                VoidedAt = x.VoidedAt,
                DocumentSide = x.SaleId != null || x.CustomerId != null ? DocumentSideEnum.SALE : DocumentSideEnum.PURCHASE,
                SaleId = x.SaleId,
                PurchaseId = x.PurchaseId,
                InvoiceNumber = x.Sale != null ? x.Sale.InvoiceNumber : x.Purchase != null ? x.Purchase.InvoiceNumber : null,
                IsOnAccount = x.SaleId == null && x.PurchaseId == null,
                PartyType = x.SaleId != null || x.CustomerId != null ? AccountingPartyTypeEnum.CUSTOMER : AccountingPartyTypeEnum.SUPPLIER,
                PartyId = x.Sale != null ? x.Sale.CustomerId : x.Purchase != null ? x.Purchase.SupplierId : x.CustomerId ?? x.SupplierId ?? 0,
                PartyName = x.Sale != null ? x.Sale.Customer.FirstName + " " + x.Sale.Customer.LastName
                    : x.Purchase != null ? x.Purchase.Supplier.CompanyName
                    : x.Customer != null ? x.Customer.FirstName + " " + x.Customer.LastName
                    : x.Supplier!.CompanyName,
                BankAccountId = x.BankAccountId,
                BankAccountTitle = x.BankAccount != null ? x.BankAccount.Title : null,
                Description = x.Description,
                CheckNumber = x.CheckNumber,
                TransferRef = x.TransferRef,
                PosTerminalId = x.PosTerminalId,
                PosTerminalName = x.PosTerminal != null ? x.PosTerminal.Name : null,
                RecordedByUserId = x.RecordedByUserId,
                RecordedByName = x.RecordedByUser != null ? x.RecordedByUser.FirstName + " " + x.RecordedByUser.LastName : null,
            });

        public static IOrderedQueryable<PaymentJournalRowDto> Sort(IQueryable<PaymentJournalRowDto> query, PaymentJournalSortEnum? sortBy, SortDirectionEnum? sortDirection)
        {
            // Default: newest payment first.
            var direction = SortingExtensions.ResolveDirection(sortBy.HasValue, sortDirection, SortDirectionEnum.DESC);
            var sorted = sortBy switch
            {
                PaymentJournalSortEnum.RECORDED_AT => query.SortBy(x => x.RecordedAt, direction),
                PaymentJournalSortEnum.AMOUNT => query.SortBy(x => x.Amount, direction),
                PaymentJournalSortEnum.PARTY_NAME => query.SortBy(x => x.PartyName, direction),
                _ => query.SortBy(x => x.PaidAt, direction),
            };
            return sorted.ThenSortBy(x => x.Id, direction);
        }

        /// <summary>Totals of the non-voided rows in <paramref name="payments"/>, overall and per payment method.</summary>
        public static async Task<PaymentJournalSummaryDto> SummarizeAsync(IQueryable<PaymentDetail> payments, CancellationToken cancellationToken)
        {
            var byType = await payments
                .Where(x => x.VoidedAt == null)
                .GroupBy(x => new { x.Type, x.Direction })
                .Select(g => new { g.Key.Type, g.Key.Direction, Count = g.Count(), Amount = g.Sum(x => x.Amount) })
                .ToListAsync(cancellationToken);

            var summary = new PaymentJournalSummaryDto
            {
                Count = byType.Sum(x => x.Count),
                TotalIn = byType.Where(x => x.Direction == PaymentDirectionEnum.IN).Sum(x => x.Amount),
                TotalOut = byType.Where(x => x.Direction == PaymentDirectionEnum.OUT).Sum(x => x.Amount),
                ByType = byType
                    .GroupBy(x => x.Type)
                    .OrderBy(g => g.Key)
                    .Select(g =>
                    {
                        var moneyIn = g.Where(x => x.Direction == PaymentDirectionEnum.IN).Sum(x => x.Amount);
                        var moneyOut = g.Where(x => x.Direction == PaymentDirectionEnum.OUT).Sum(x => x.Amount);
                        return new PaymentTypeTotalDto { Type = g.Key, Count = g.Sum(x => x.Count), In = moneyIn, Out = moneyOut, Net = moneyIn - moneyOut };
                    })
                    .ToList(),
            };
            summary.Net = summary.TotalIn - summary.TotalOut;
            return summary;
        }

        public async Task<ResponseDto> Handle(GetPaymentJournalQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var filtered = Filter(_context, request);

            var summary = await SummarizeAsync(filtered, cancellationToken);

            var paged = await Sort(Project(filtered), request.SortBy, request.SortDirection).ToPagedAsync(request.Page, request.Take, cancellationToken);

            res.Data = new
            {
                PaymentJournal = paged.Items,
                Summary = summary,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = paged.PageCount,
                    Take = request.Take,
                    Total = paged.TotalCount
                }
            };
            res.Message = "دفتر دریافت و پرداخت با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
