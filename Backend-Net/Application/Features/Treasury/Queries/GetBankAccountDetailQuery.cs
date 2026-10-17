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
    public class GetBankAccountDetailQuery : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class GetBankAccountDetailQueryHandler : IRequestHandler<GetBankAccountDetailQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetBankAccountDetailQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetBankAccountDetailQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            res.Data = await BankAccountLedger.ReadAsync(_context, request.Id, cancellationToken);
            res.Message = "جزئیات حساب ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
