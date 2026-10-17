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
    /// Every cash box and bank account with its current balance, cash boxes first then by title. Not paged: a business has a
    /// handful of accounts, and the frontend uses this list for the account picker on every payment form too.
    /// </summary>
    public class GetBankAccountListQuery : IRequest<ResponseDto>
    {
        public BankAccountKindEnum? Kind { get; set; }

        /// <summary>Deactivated accounts are left out unless asked for (their history stays readable).</summary>
        public bool IncludeInactive { get; set; }
    }

    public class GetBankAccountListQueryHandler : IRequestHandler<GetBankAccountListQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetBankAccountListQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetBankAccountListQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var query = _context.BankAccounts.AsNoTracking();
            if (!request.IncludeInactive)
                query = query.Where(x => x.IsActive);
            if (request.Kind.HasValue)
                query = query.Where(x => x.Kind == request.Kind);

            var accounts = await query.OrderBy(x => x.Kind).ThenBy(x => x.Title).ThenBy(x => x.Id).ToListAsync(cancellationToken);
            var net = await BankAccountLedger.NetMovementsAsync(_context, accounts.Select(x => x.Id).ToList(), null, cancellationToken);
            var rows = accounts.Select(x => BankAccountLedger.ToDto(x, net[x.Id])).ToList();

            res.Data = new BankAccountListDto
            {
                Accounts = rows,
                TotalCashBoxBalance = rows.Where(x => x.Kind == BankAccountKindEnum.CASH_BOX).Sum(x => x.Balance),
                TotalBankBalance = rows.Where(x => x.Kind == BankAccountKindEnum.BANK).Sum(x => x.Balance),
                TotalBalance = rows.Sum(x => x.Balance),
                UnassignedNet = await BankAccountLedger.UnassignedNetAsync(_context, cancellationToken),
            };
            res.Message = "فهرست صندوق‌ها و حساب‌ها ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
