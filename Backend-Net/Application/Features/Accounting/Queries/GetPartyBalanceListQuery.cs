using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Application.Features.Accounting.Dtos;
using Common.Extensions;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Accounting.Queries
{
    public enum PartyBalanceListSortEnum
    {
        BALANCE = 0,
        NAME = 1,
        TOTAL_DEBIT = 2,
        TOTAL_CREDIT = 3,
        LAST_ENTRY_AT = 4,
        LAST_PAYMENT_AT = 5,
    }

    /// <summary>
    /// The party balance table (جدول حساب اشخاص): customers and suppliers in one table with their ledger totals, balance,
    /// last activity, and the aging of what they still owe (or we owe them). The summary covers every party in the filter.
    /// Balances are as of now; for a dated view of one party use PartyAccount/GetPartyStatement.
    /// </summary>
    public class GetPartyBalanceListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;

        /// <summary>Null = both.</summary>
        public AccountingPartyTypeEnum? PartyType { get; set; }
        public PartyBalanceStateEnum? BalanceState { get; set; }
        public decimal? MinBalance { get; set; }
        public decimal? MaxBalance { get; set; }

        /// <summary>Only parties with something past due.</summary>
        public bool OverdueOnly { get; set; }

        /// <summary>Name or phone, contains.</summary>
        public string? Search { get; set; }

        public PartyBalanceListSortEnum? SortBy { get; set; }
        public SortDirectionEnum? SortDirection { get; set; }
    }

    public class GetPartyBalanceListQueryValidator : AbstractValidator<GetPartyBalanceListQuery>
    {
        public GetPartyBalanceListQueryValidator()
        {
            RuleFor(x => x.MaxBalance).GreaterThanOrEqualTo(x => x.MinBalance).When(x => x.MinBalance.HasValue && x.MaxBalance.HasValue)
                .WithMessage("حداکثر مانده نمی‌تواند کمتر از حداقل آن باشد.");
        }
    }

    public class GetPartyBalanceListQueryHandler : IRequestHandler<GetPartyBalanceListQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetPartyBalanceListQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        /// <summary>The filtered rows, without the overdue filter (which needs the open items) - shared with the export.</summary>
        public static IQueryable<PartyBalanceRowDto> Build(IWMSDbContext context, GetPartyBalanceListQuery request)
        {
            var query = PartyBalances.Rows(context, request.PartyType);

            query = request.BalanceState switch
            {
                PartyBalanceStateEnum.DEBTOR => query.Where(x => x.Balance > 0),
                PartyBalanceStateEnum.CREDITOR => query.Where(x => x.Balance < 0),
                PartyBalanceStateEnum.SETTLED => query.Where(x => x.Balance == 0),
                _ => query,
            };
            if (request.MinBalance.HasValue)
                query = query.Where(x => x.Balance >= request.MinBalance);
            if (request.MaxBalance.HasValue)
                query = query.Where(x => x.Balance <= request.MaxBalance);

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var search = request.Search.Trim();
                query = query.Where(x => x.Name.Contains(search) || x.Phone!.Contains(search));
            }

            return query;
        }

        public static IOrderedQueryable<PartyBalanceRowDto> Sort(IQueryable<PartyBalanceRowDto> query, PartyBalanceListSortEnum? sortBy, SortDirectionEnum? sortDirection)
        {
            // Default: the largest balance first - who owes us most at the top.
            var direction = SortingExtensions.ResolveDirection(sortBy.HasValue, sortDirection, SortDirectionEnum.DESC);
            var sorted = sortBy switch
            {
                PartyBalanceListSortEnum.NAME => query.SortBy(x => x.Name, direction),
                PartyBalanceListSortEnum.TOTAL_DEBIT => query.SortBy(x => x.TotalDebit, direction),
                PartyBalanceListSortEnum.TOTAL_CREDIT => query.SortBy(x => x.TotalCredit, direction),
                PartyBalanceListSortEnum.LAST_ENTRY_AT => query.SortBy(x => x.LastEntryAt, direction),
                PartyBalanceListSortEnum.LAST_PAYMENT_AT => query.SortBy(x => x.LastPaymentAt, direction),
                _ => query.SortBy(x => x.Balance, direction),
            };
            // No single id column across the union: the party type plus its id is the unique key.
            return sorted.ThenSortBy(x => x.PartyType, direction).ThenSortBy(x => x.PartyId, direction);
        }

        public async Task<ResponseDto> Handle(GetPartyBalanceListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var today = DateTime.Now;

            var query = Build(_context, request);

            var openItems = await AccountingDocuments.LoadOpenItemsAsync(_context, cancellationToken);
            var openByParty = openItems.ToLookup(x => (x.PartyType, x.PartyId));

            if (request.OverdueOnly)
            {
                var overdue = openItems.Where(x => AccountingDocuments.DaysPastDue(x.DueDate, today) > 0).ToList();
                var customerIds = overdue.Where(x => x.PartyType == AccountingPartyTypeEnum.CUSTOMER).Select(x => x.PartyId).Distinct().ToList();
                var supplierIds = overdue.Where(x => x.PartyType == AccountingPartyTypeEnum.SUPPLIER).Select(x => x.PartyId).Distinct().ToList();
                query = query.Where(x => (x.PartyType == AccountingPartyTypeEnum.CUSTOMER && customerIds.Contains(x.PartyId))
                    || (x.PartyType == AccountingPartyTypeEnum.SUPPLIER && supplierIds.Contains(x.PartyId)));
            }

            // Only the numbers of every matching party - parties are a bounded set, and the aging of the summary needs them.
            var all = await query
                .Select(x => new { x.PartyType, x.PartyId, x.TotalDebit, x.TotalCredit, x.Balance })
                .ToListAsync(cancellationToken);

            var summary = new PartyBalanceSummaryDto
            {
                Count = all.Count,
                TotalDebit = all.Sum(x => x.TotalDebit),
                TotalCredit = all.Sum(x => x.TotalCredit),
                TotalReceivable = all.Where(x => x.Balance > 0).Sum(x => x.Balance),
                TotalPayable = -all.Where(x => x.Balance < 0).Sum(x => x.Balance),
                DebtorCount = all.Count(x => x.Balance > 0),
                CreditorCount = all.Count(x => x.Balance < 0),
                ReceivableAging = AgingDto.Of(all.Where(x => x.PartyType == AccountingPartyTypeEnum.CUSTOMER)
                    .SelectMany(x => openByParty[(x.PartyType, x.PartyId)]), today),
                PayableAging = AgingDto.Of(all.Where(x => x.PartyType == AccountingPartyTypeEnum.SUPPLIER)
                    .SelectMany(x => openByParty[(x.PartyType, x.PartyId)]), today),
            };
            summary.Net = summary.TotalReceivable - summary.TotalPayable;

            var paged = await Sort(query, request.SortBy, request.SortDirection).ToPagedAsync(request.Page, request.Take, cancellationToken);
            foreach (var row in paged.Items)
            {
                var items = openByParty[(row.PartyType, row.PartyId)].ToList();
                row.OpenItemCount = items.Count;
                row.Aging = AgingDto.Of(items, today);
            }

            res.Data = new
            {
                PartyBalanceList = paged.Items,
                Summary = summary,
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = paged.PageCount,
                    Take = request.Take,
                    Total = paged.TotalCount
                }
            };
            res.Message = "مانده‌ی حساب اشخاص با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
