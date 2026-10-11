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
    public enum PartyLedgerEntryListSortEnum
    {
        OCCURRED_AT = 0,
        AMOUNT = 1,
        PARTY_NAME = 2,
    }

    /// <summary>
    /// The party ledger across every customer and supplier (دفتر حساب اشخاص) - the drill-down behind the balance table.
    /// Paged, so it carries no running balance (that only means something per party over a contiguous range: use
    /// PartyAccount/GetPartyStatement); the summary totals every row in the filter.
    /// </summary>
    public class GetPartyLedgerEntryListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;

        /// <summary>On OccurredAt, both days inclusive.</summary>
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public AccountingPartyTypeEnum? PartyType { get; set; }
        public int? CustomerId { get; set; }
        public int? SupplierId { get; set; }

        /// <summary>Empty = every type.</summary>
        public List<PartyLedgerEntryTypeEnum>? EntryTypes { get; set; }
        public PartyLedgerDirectionEnum? Direction { get; set; }
        public int? SaleId { get; set; }
        public int? PurchaseId { get; set; }

        /// <summary>Leave out rows that a REVERSAL takes back, and the REVERSAL rows themselves - what is still standing.</summary>
        public bool ExcludeReversed { get; set; }

        /// <summary>Description, invoice number or party name, contains.</summary>
        public string? Search { get; set; }

        public PartyLedgerEntryListSortEnum? SortBy { get; set; }
        public SortDirectionEnum? SortDirection { get; set; }
    }

    public class GetPartyLedgerEntryListQueryValidator : AbstractValidator<GetPartyLedgerEntryListQuery>
    {
        public GetPartyLedgerEntryListQueryValidator()
        {
            RuleFor(x => x.ToDate).GreaterThanOrEqualTo(x => x.FromDate).When(x => x.FromDate.HasValue && x.ToDate.HasValue)
                .WithMessage("تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.");
        }
    }

    public class GetPartyLedgerEntryListQueryHandler : IRequestHandler<GetPartyLedgerEntryListQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetPartyLedgerEntryListQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public static IQueryable<PartyLedgerEntry> Filter(IWMSDbContext context, GetPartyLedgerEntryListQuery request)
        {
            var query = context.PartyLedgerEntries.AsQueryable();

            var from = DateRange.Start(request.FromDate);
            var to = DateRange.EndExclusive(request.ToDate);
            if (from.HasValue)
                query = query.Where(x => x.OccurredAt >= from);
            if (to.HasValue)
                query = query.Where(x => x.OccurredAt < to);

            if (request.PartyType == AccountingPartyTypeEnum.CUSTOMER)
                query = query.Where(x => x.CustomerId != null);
            if (request.PartyType == AccountingPartyTypeEnum.SUPPLIER)
                query = query.Where(x => x.SupplierId != null);
            if (request.CustomerId.HasValue)
                query = query.Where(x => x.CustomerId == request.CustomerId);
            if (request.SupplierId.HasValue)
                query = query.Where(x => x.SupplierId == request.SupplierId);
            if (request.EntryTypes is { Count: > 0 })
                query = query.Where(x => request.EntryTypes.Contains(x.EntryType));
            if (request.Direction.HasValue)
                query = query.Where(x => x.Direction == request.Direction);
            if (request.SaleId.HasValue)
                query = query.Where(x => x.SaleId == request.SaleId);
            if (request.PurchaseId.HasValue)
                query = query.Where(x => x.PurchaseId == request.PurchaseId);

            if (request.ExcludeReversed)
            {
                var ledger = context.PartyLedgerEntries;
                query = query.Where(x => x.EntryType != PartyLedgerEntryTypeEnum.REVERSAL && !ledger.Any(r => r.ReversalOfEntryId == x.Id));
            }

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var search = request.Search.Trim();
                query = query.Where(x => x.Description!.Contains(search)
                    || (x.Sale != null && x.Sale.InvoiceNumber.Contains(search))
                    || (x.Purchase != null && x.Purchase.InvoiceNumber.Contains(search))
                    || (x.Customer != null && (x.Customer.FirstName + " " + x.Customer.LastName).Contains(search))
                    || (x.Supplier != null && x.Supplier.CompanyName.Contains(search)));
            }

            return query;
        }

        public static IQueryable<PartyLedgerEntryRowDto> Project(IWMSDbContext context, IQueryable<PartyLedgerEntry> query)
        {
            var ledger = context.PartyLedgerEntries;
            return query.Select(x => new PartyLedgerEntryRowDto
            {
                Id = x.Id,
                OccurredAt = x.OccurredAt,
                CreatedAt = x.CreatedAt,
                PartyType = x.CustomerId != null ? AccountingPartyTypeEnum.CUSTOMER : AccountingPartyTypeEnum.SUPPLIER,
                PartyId = x.CustomerId ?? x.SupplierId!.Value,
                PartyName = x.Customer != null ? x.Customer.FirstName + " " + x.Customer.LastName : x.Supplier!.CompanyName,
                EntryType = x.EntryType,
                Direction = x.Direction,
                Debit = x.Direction == PartyLedgerDirectionEnum.DEBIT ? (decimal)x.Amount : 0m,
                Credit = x.Direction == PartyLedgerDirectionEnum.CREDIT ? (decimal)x.Amount : 0m,
                Description = x.Description,
                SaleId = x.SaleId,
                PurchaseId = x.PurchaseId,
                InvoiceNumber = x.Sale != null ? x.Sale.InvoiceNumber : x.Purchase != null ? x.Purchase.InvoiceNumber : null,
                PaymentDetailId = x.PaymentDetailId,
                PaymentType = x.PaymentDetail != null ? (PaymentTypeEnum?)x.PaymentDetail.Type : null,
                SaleReturnClaimId = x.SaleReturnClaimId,
                PurchaseReturnClaimId = x.PurchaseReturnClaimId,
                PurchaseItemId = x.PurchaseItemId,
                ReversalOfEntryId = x.ReversalOfEntryId,
                IsReversed = ledger.Any(r => r.ReversalOfEntryId == x.Id),
            });
        }

        public static IOrderedQueryable<PartyLedgerEntryRowDto> Sort(IQueryable<PartyLedgerEntryRowDto> query, PartyLedgerEntryListSortEnum? sortBy, SortDirectionEnum? sortDirection)
        {
            // Default: newest row first.
            var direction = SortingExtensions.ResolveDirection(sortBy.HasValue, sortDirection, SortDirectionEnum.DESC);
            var sorted = sortBy switch
            {
                PartyLedgerEntryListSortEnum.AMOUNT => query.SortBy(x => x.Debit + x.Credit, direction),
                PartyLedgerEntryListSortEnum.PARTY_NAME => query.SortBy(x => x.PartyName, direction),
                _ => query.SortBy(x => x.OccurredAt, direction),
            };
            return sorted.ThenSortBy(x => x.Id, direction);
        }

        public async Task<ResponseDto> Handle(GetPartyLedgerEntryListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var filtered = Filter(_context, request);

            var sides = await filtered
                .GroupBy(x => x.Direction)
                .Select(g => new { Direction = g.Key, Count = g.Count(), Total = g.Sum(x => (decimal)x.Amount) })
                .ToListAsync(cancellationToken);
            var summary = new PartyLedgerEntrySummaryDto
            {
                Count = sides.Sum(x => x.Count),
                TotalDebit = sides.Where(x => x.Direction == PartyLedgerDirectionEnum.DEBIT).Sum(x => x.Total),
                TotalCredit = sides.Where(x => x.Direction == PartyLedgerDirectionEnum.CREDIT).Sum(x => x.Total),
            };
            summary.Net = summary.TotalDebit - summary.TotalCredit;

            var paged = await Sort(Project(_context, filtered), request.SortBy, request.SortDirection).ToPagedAsync(request.Page, request.Take, cancellationToken);
            foreach (var row in paged.Items)
                row.EntryTypeTitle = row.EntryType.GetDescription();

            res.Data = new
            {
                PartyLedgerEntryList = paged.Items,
                Summary = summary,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = paged.PageCount,
                    Take = request.Take,
                    Total = paged.TotalCount
                }
            };
            res.Message = "دفتر حساب اشخاص با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
