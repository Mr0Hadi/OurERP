using Application.Common.Contracts.Context;
using Application.Common.Dtos;
using Application.Common.Enums;
using FluentValidation;
using MediatR;

namespace Application.Features.PartyAccount.Queries
{
    /// <summary>One on-account payment with every allocation it has had (active and voided).</summary>
    public class GetPartyPaymentDetailQuery : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class GetPartyPaymentDetailQueryValidator : AbstractValidator<GetPartyPaymentDetailQuery>
    {
        public GetPartyPaymentDetailQueryValidator()
        {
            RuleFor(x => x.Id).GreaterThan(0).WithMessage("دریافت/پرداخت نامعتبر است.");
        }
    }

    public class GetPartyPaymentDetailQueryHandler : IRequestHandler<GetPartyPaymentDetailQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public GetPartyPaymentDetailQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(GetPartyPaymentDetailQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            res.Data = await PartyPaymentReader.ReadAsync(_context, request.Id, cancellationToken);
            res.Message = "جزئیات دریافت/پرداخت ارسال شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
