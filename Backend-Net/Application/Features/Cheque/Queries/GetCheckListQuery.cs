using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Application.Features.Accounting;
using Application.Features.Cheque.Dtos;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Cheque.Queries
{
    public enum CheckListSortEnum
    {
        DUE_DATE = 0,
        AMOUNT = 1,
        PAID_AT = 2,
        PARTY_NAME = 3,
    }

    /// <summary>
    /// Cheques received and issued (چک‌های دریافتی و پرداختی), earliest due first by default - the treasury's to-do list. A
    /// cheque voided as a mistake while still pending is left out unless asked for; bounced ones are always there.
    /// </summary>
    public class GetCheckListQuery : IRequest<ResponseDto>
    {
        public int Page { get; set; } = 1;
        public int Take { get; set; } = 10;

        /// <summary>IN = received, OUT = issued or passed on.</summary>
        public PaymentDirectionEnum? Direction { get; set; }

        /// <summary>Empty = every status (`?statuses=1&amp;statuses=3`).</summary>
        public List<PaymentCheckStatusEnum>? Statuses { get; set; }

        /// <summary>On the date written on the cheque, both days inclusive.</summary>
        public DateTime? FromDueDate { get; set; }
        public DateTime? ToDueDate { get; set; }

        public int? CustomerId { get; set; }
        public int? SupplierId { get; set; }
        public int? BankAccountId { get; set; }
        public bool IncludeVoided { get; set; }

        /// <summary>Cheque number, drawer, bank, party name or invoice number, contains.</summary>
        public string? Search { get; set; }

        public CheckListSortEnum? SortBy { get; set; }
        public SortDirectionEnum? SortDirection { get; set; }
    }

    public class GetCheckListQueryValidator : AbstractValidator<GetCheckListQuery>
    {
        public GetCheckListQueryValidator()
        {
            RuleFor(x => x.ToDueDate).GreaterThanOrEqualTo(x => x.FromDueDate).When(x => x.FromDueDate.HasValue && x.ToDueDate.HasValue)
                .WithMessage("تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.");
        }
    }

    public class GetCheckListQueryHandler : IRequestHandler<GetCheckListQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetCheckListQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetCheckListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var query = ChequeReader.Cheques(_context).AsNoTracking();
            if (!request.IncludeVoided)
                query = query.Where(x => x.VoidedAt == null || x.CheckStatus == PaymentCheckStatusEnum.BOUNCED);
            if (request.Direction.HasValue)
                query = query.Where(x => x.Direction == request.Direction);
            if (request.Statuses is { Count: > 0 })
                query = query.Where(x => request.Statuses.Contains(x.CheckStatus!.Value));

            var from = DateRange.Start(request.FromDueDate);
            var to = DateRange.EndExclusive(request.ToDueDate);
            if (from.HasValue)
                query = query.Where(x => x.CheckDueDate >= from);
            if (to.HasValue)
                query = query.Where(x => x.CheckDueDate < to);

            if (request.CustomerId.HasValue)
                query = query.Where(x => (x.Sale != null && x.Sale.CustomerId == request.CustomerId) || x.CustomerId == request.CustomerId);
            if (request.SupplierId.HasValue)
                query = query.Where(x => (x.Purchase != null && x.Purchase.SupplierId == request.SupplierId) || x.SupplierId == request.SupplierId);
            if (request.BankAccountId.HasValue)
                query = query.Where(x => x.BankAccountId == request.BankAccountId);

            if (!string.IsNullOrWhiteSpace(request.Search))
            {
                var search = request.Search.Trim();
                query = query.Where(x => x.CheckNumber!.Contains(search) || x.CheckDrawerName!.Contains(search) || x.CheckBankName!.Contains(search)
                    || (x.Sale != null && (x.Sale.InvoiceNumber.Contains(search) || (x.Sale.Customer.FirstName + " " + x.Sale.Customer.LastName).Contains(search)))
                    || (x.Purchase != null && (x.Purchase.InvoiceNumber.Contains(search) || x.Purchase.Supplier.CompanyName.Contains(search)))
                    || (x.Customer != null && (x.Customer.FirstName + " " + x.Customer.LastName).Contains(search))
                    || (x.Supplier != null && x.Supplier.CompanyName.Contains(search)));
            }

            var today = DateTime.Today;
            var totals = await query
                .Where(x => x.CheckStatus == PaymentCheckStatusEnum.PENDING && x.VoidedAt == null)
                .GroupBy(x => new { x.Direction, PastDue = x.CheckDueDate < today })
                .Select(g => new { g.Key.Direction, g.Key.PastDue, Count = g.Count(), Amount = g.Sum(x => x.Amount) })
                .ToListAsync(cancellationToken);

            var rows = query.Select(ChequeReader.Projection(_context));
            // Default: the earliest date on the cheque first - what falls due next.
            var direction = SortingExtensions.ResolveDirection(request.SortBy.HasValue, request.SortDirection, SortDirectionEnum.ASC);
            var sorted = request.SortBy switch
            {
                CheckListSortEnum.AMOUNT => rows.SortBy(x => x.Amount, direction),
                CheckListSortEnum.PAID_AT => rows.SortBy(x => x.PaidAt, direction),
                CheckListSortEnum.PARTY_NAME => rows.SortBy(x => x.PartyName, direction),
                _ => rows.SortBy(x => x.CheckDueDate, direction),
            };

            var paged = await sorted.ThenSortBy(x => x.Id, direction).ToPagedAsync(request.Page, request.Take, cancellationToken);
            foreach (var item in paged.Items)
                ChequeReader.Complete(item);

            res.Data = new
            {
                CheckList = paged.Items,
                Summary = new ChequeListSummaryDto
                {
                    PendingReceivedCount = totals.Where(x => x.Direction == PaymentDirectionEnum.IN).Sum(x => x.Count),
                    PendingReceivedAmount = totals.Where(x => x.Direction == PaymentDirectionEnum.IN).Sum(x => x.Amount),
                    PendingIssuedCount = totals.Where(x => x.Direction == PaymentDirectionEnum.OUT).Sum(x => x.Count),
                    PendingIssuedAmount = totals.Where(x => x.Direction == PaymentDirectionEnum.OUT).Sum(x => x.Amount),
                    PastDueReceivedAmount = totals.Where(x => x.Direction == PaymentDirectionEnum.IN && x.PastDue).Sum(x => x.Amount),
                    PastDueIssuedAmount = totals.Where(x => x.Direction == PaymentDirectionEnum.OUT && x.PastDue).Sum(x => x.Amount),
                },
                Page = new ResponsePageDto
                {
                    Page = request.Page,
                    PageCount = paged.PageCount,
                    Take = request.Take,
                    Total = paged.TotalCount
                },
            };
            res.Message = "فهرست چک‌ها ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
