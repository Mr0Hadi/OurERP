using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Ledger;
using Application.Features.PartyAccount.Dtos;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.PartyAccount.Queries
{
    /// <summary>
    /// A customer's or supplier's statement (گردش حساب): every party-ledger row in the period, oldest first, with the
    /// opening balance before it and a running balance after each row. Not paged on purpose - a running balance only means
    /// something over a contiguous stretch; narrow it with FromDate/ToDate instead.
    /// </summary>
    public class GetPartyStatementQuery : IRequest<ResponseDto>
    {
        /// <summary>Exactly one of CustomerId / SupplierId.</summary>
        public int? CustomerId { get; set; }
        public int? SupplierId { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
    }

    public class GetPartyStatementQueryValidator : AbstractValidator<GetPartyStatementQuery>
    {
        public GetPartyStatementQueryValidator()
        {
            RuleFor(x => x).Must(x => x.CustomerId.HasValue != x.SupplierId.HasValue)
                .WithMessage("دقیقاً یکی از مشتری یا تامین‌کننده را مشخص کنید.");
            RuleFor(x => x.ToDate).GreaterThanOrEqualTo(x => x.FromDate)
                .When(x => x.FromDate.HasValue && x.ToDate.HasValue)
                .WithMessage("تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.");
        }
    }

    public class GetPartyStatementQueryHandler : IRequestHandler<GetPartyStatementQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetPartyStatementQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetPartyStatementQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            string partyName;
            if (request.CustomerId.HasValue)
            {
                partyName = await _context.Customers.AsNoTracking()
                    .Where(x => x.Id == request.CustomerId.Value)
                    .Select(x => x.FirstName + " " + x.LastName)
                    .FirstOrDefaultAsync(cancellationToken)
                    ?? throw new NotFoundCustomException("مشتری مورد نظر یافت نشد.");
            }
            else
            {
                partyName = await _context.Suppliers.AsNoTracking()
                    .Where(x => x.Id == request.SupplierId!.Value)
                    .Select(x => x.CompanyName)
                    .FirstOrDefaultAsync(cancellationToken)
                    ?? throw new NotFoundCustomException("تامین‌کننده‌ی مورد نظر یافت نشد.");
            }

            var partyRows = _context.PartyLedgerEntries.AsNoTracking()
                .Where(x => request.CustomerId.HasValue ? x.CustomerId == request.CustomerId : x.SupplierId == request.SupplierId);

            var opening = 0m;
            if (request.FromDate.HasValue)
            {
                var before = await partyRows
                    .Where(x => x.OccurredAt < request.FromDate.Value)
                    .GroupBy(x => x.Direction)
                    .Select(g => new { Direction = g.Key, Total = g.Sum(x => (decimal)x.Amount) })
                    .ToListAsync(cancellationToken);
                opening = before.Sum(x => x.Direction == PartyLedgerDirectionEnum.DEBIT ? x.Total : -x.Total);
            }

            var inPeriod = partyRows;
            if (request.FromDate.HasValue)
                inPeriod = inPeriod.Where(x => x.OccurredAt >= request.FromDate.Value);
            if (request.ToDate.HasValue)
                inPeriod = inPeriod.Where(x => x.OccurredAt <= request.ToDate.Value);

            var rows = await inPeriod
                .OrderBy(x => x.OccurredAt)
                .ThenBy(x => x.Id)
                .ToListAsync(cancellationToken);

            var statement = new PartyStatementDto
            {
                CustomerId = request.CustomerId,
                SupplierId = request.SupplierId,
                PartyName = partyName,
                FromDate = request.FromDate,
                ToDate = request.ToDate,
                OpeningBalance = opening,
            };

            var running = opening;
            foreach (var row in rows)
            {
                var debit = row.Direction == PartyLedgerDirectionEnum.DEBIT ? (decimal)row.Amount : 0m;
                var credit = row.Direction == PartyLedgerDirectionEnum.CREDIT ? (decimal)row.Amount : 0m;
                running += debit - credit;
                statement.TotalDebit += debit;
                statement.TotalCredit += credit;
                statement.Entries.Add(new PartyStatementEntryDto
                {
                    Id = row.Id,
                    OccurredAt = row.OccurredAt,
                    EntryType = row.EntryType,
                    EntryTypeTitle = row.EntryType.GetDescription(),
                    Direction = row.Direction,
                    Debit = debit,
                    Credit = credit,
                    RunningBalance = running,
                    Description = row.Description,
                    SaleId = row.SaleId,
                    PurchaseId = row.PurchaseId,
                    PaymentDetailId = row.PaymentDetailId,
                    SaleReturnClaimId = row.SaleReturnClaimId,
                    PurchaseReturnClaimId = row.PurchaseReturnClaimId,
                    ReversalOfEntryId = row.ReversalOfEntryId,
                });
            }
            statement.ClosingBalance = running;

            res.Data = statement;
            res.Message = "گردش حساب با موفقیت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
