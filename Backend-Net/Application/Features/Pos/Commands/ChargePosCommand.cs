using Application.Common.Contracts.Pos;
using Application.Common.Dtos;
using Application.Common.Dtos.Pos;
using Application.Common.Enums;
using Common.Extensions;
using FluentValidation;
using MediatR;

namespace Application.Features.Pos.Commands
{
    public class ChargePosCommand : IRequest<ResponseDto>
    {
        public int PosTerminalId { get; set; }
        public ulong Amount { get; set; }
        public string InvoiceNumber { get; set; } = "";
        public string? AdditionalData { get; set; }
    }

    public class ChargePosCommandValidator : AbstractValidator<ChargePosCommand>
    {
        public ChargePosCommandValidator()
        {
            RuleFor(x => x.PosTerminalId).GreaterThan(0).WithMessage(Validation.RequiredMessage("دستگاه کارتخوان"));
            RuleFor(x => x.Amount).GreaterThan(0ul).WithMessage(Validation.RequiredMessage("مبلغ"));
        }
    }

    public class ChargePosCommandHandler : IRequestHandler<ChargePosCommand, ResponseDto>
    {
        private readonly IPosPaymentGateway _posPaymentGateway;

        public ChargePosCommandHandler(IPosPaymentGateway posPaymentGateway)
        {
            _posPaymentGateway = posPaymentGateway;
        }

        public async Task<ResponseDto> Handle(ChargePosCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var result = await _posPaymentGateway.ChargeAsync(new PosChargeRequestDto
            {
                PosTerminalId = request.PosTerminalId,
                Amount = request.Amount,
                InvoiceNumber = request.InvoiceNumber,
                AdditionalData = request.AdditionalData
            }, cancellationToken);

            res.Data = result;

            if (result.IsSuccess)
            {
                res.Message = "تراکنش با موفقیت انجام شد.";
                res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            }
            else
            {
                res.Message = string.IsNullOrEmpty(result.ResponseMessage)
                    ? "تراکنش کارتخوان ناموفق بود."
                    : result.ResponseMessage;
                res.ResponseMessageType = ResponseMessageTypeEnum.Warning.ToString();
            }

            return res;
        }
    }
}
