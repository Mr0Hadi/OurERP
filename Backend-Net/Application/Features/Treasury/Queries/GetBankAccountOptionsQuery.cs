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
    /// The account picker of every payment form: active accounts, id/title/kind only - no balances, so it can be opened to
    /// anyone who records money (cashier, installment clerk) without showing them what the accounts hold.
    /// </summary>
    public class GetBankAccountOptionsQuery : IRequest<ResponseDto>
    {
        public BankAccountKindEnum? Kind { get; set; }
    }

    public class GetBankAccountOptionsQueryHandler : IRequestHandler<GetBankAccountOptionsQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetBankAccountOptionsQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetBankAccountOptionsQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            res.Data = await _context.BankAccounts.AsNoTracking()
                .Where(x => x.IsActive && (request.Kind == null || x.Kind == request.Kind))
                .OrderBy(x => x.Kind).ThenBy(x => x.Title).ThenBy(x => x.Id)
                .Select(x => new BankAccountOptionDto { Id = x.Id, Title = x.Title, Kind = x.Kind, BankName = x.BankName })
                .ToListAsync(cancellationToken);
            res.Message = "فهرست صندوق‌ها و حساب‌ها ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
