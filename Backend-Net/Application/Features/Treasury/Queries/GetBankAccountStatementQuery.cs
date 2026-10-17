using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.Treasury.Dtos;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.Treasury.Queries
{
    /// <summary>
    /// An account's statement (گردش حساب): every receipt, payment and transfer in the period, oldest first, with the balance
    /// before it and a running balance after each line. Not paged, like the party statement - narrow it with the dates.
    /// </summary>
    public class GetBankAccountStatementQuery : IRequest<ResponseDto>
    {
        public int BankAccountId { get; set; }

        /// <summary>Both days inclusive.</summary>
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
    }

    public class GetBankAccountStatementQueryValidator : AbstractValidator<GetBankAccountStatementQuery>
    {
        public GetBankAccountStatementQueryValidator()
        {
            RuleFor(x => x.BankAccountId).GreaterThan(0).WithMessage("حساب را انتخاب کنید.");
            RuleFor(x => x.ToDate).GreaterThanOrEqualTo(x => x.FromDate).When(x => x.FromDate.HasValue && x.ToDate.HasValue)
                .WithMessage("تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.");
        }
    }

    public class GetBankAccountStatementQueryHandler : IRequestHandler<GetBankAccountStatementQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetBankAccountStatementQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetBankAccountStatementQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var account = await BankAccountLedger.ReadAsync(_context, request.BankAccountId, cancellationToken);
            var (from, to) = BankAccountLedger.Range(request.FromDate, request.ToDate);

            var before = from.HasValue
                ? (await BankAccountLedger.NetMovementsAsync(_context, new[] { account.Id }, from, cancellationToken))[account.Id]
                : 0m;
            var opening = account.OpeningBalance + before;

            var rows = await BankAccountLedger.MovementsAsync(_context, account.Id, from, to, cancellationToken);
            var running = opening;
            foreach (var row in rows)
            {
                running += row.In - row.Out;
                row.Balance = running;
            }

            res.Data = new BankAccountStatementDto
            {
                Account = account,
                FromDate = request.FromDate,
                ToDate = request.ToDate,
                OpeningBalance = opening,
                TotalIn = rows.Sum(x => x.In),
                TotalOut = rows.Sum(x => x.Out),
                ClosingBalance = running,
                Rows = rows,
            };
            res.Message = "گردش حساب ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
