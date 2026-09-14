using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Domain.Enums;
using FluentValidation;
using MediatR;
using PurchaseReturnCommands = Application.Features.PurchaseReturn.Commands;
using SaleCommands = Application.Features.Sale.Commands;
using SaleReturnCommands = Application.Features.SaleReturn.Commands;

namespace Application.Features.Shipment.Commands
{
    // One outbound vehicle, recorded atomically: order lines of a sale, replacement goods for sale returns, and goods going back
    // to a supplier - the mirror of ReceiveShipmentCommand. Outbound only: every return round line must target a GOODS_OUT effect.
    public class DispatchShipmentCommand : IRequest<ResponseDto>
    {
        public SaleCommands.ShipSaleCommand? Sale { get; set; }
        public List<SaleReturnCommands.ExecuteGoodsRoundCommand> SaleReturnRounds { get; set; } = new();
        public List<PurchaseReturnCommands.ExecuteGoodsRoundCommand> PurchaseReturnRounds { get; set; } = new();
    }

    public class DispatchShipmentCommandValidator : AbstractValidator<DispatchShipmentCommand>
    {
        public DispatchShipmentCommandValidator()
        {
            RuleFor(x => x).Must(x => x.Sale != null || (x.SaleReturnRounds?.Count ?? 0) > 0 || (x.PurchaseReturnRounds?.Count ?? 0) > 0)
                .WithMessage("ارسال باید دست‌کم شامل ارسال فروش یا یک مرحله‌ی کالای مرجوعی باشد.");
        }
    }

    public class DispatchShipmentCommandHandler : IRequestHandler<DispatchShipmentCommand, ResponseDto>
    {
        private readonly IMediator _mediator;
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public DispatchShipmentCommandHandler(IMediator mediator, IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _mediator = mediator;
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(DispatchShipmentCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var saleReturnRounds = request.SaleReturnRounds ?? new();
            var purchaseReturnRounds = request.PurchaseReturnRounds ?? new();

            await ShipmentDirections.EnsureAsync(_context, ReturnEffectDirectionEnum.GOODS_OUT,
                purchaseReturnRounds.SelectMany(r => r.Rounds ?? new()).Select(l => l.EffectId),
                saleReturnRounds.SelectMany(r => r.Rounds ?? new()).Select(l => l.EffectId),
                "ارسال فقط خروج کالا را ثبت می‌کند؛ اثرهای ورودی را با رسید (ReceiveShipment) اجرا کنید.",
                cancellationToken);

            res.Data = await _unitOfWork.ExecuteInTransactionAsync(async ct =>
            {
                var sale = request.Sale != null ? (await _mediator.Send(request.Sale, ct)).Data : null;

                var saleReturns = new List<object?>();
                foreach (var round in saleReturnRounds)
                    saleReturns.Add((await _mediator.Send(round, ct)).Data);

                var purchaseReturns = new List<object?>();
                foreach (var round in purchaseReturnRounds)
                    purchaseReturns.Add((await _mediator.Send(round, ct)).Data);

                return new { Sale = sale, SaleReturns = saleReturns, PurchaseReturns = purchaseReturns };
            }, cancellationToken);

            res.Message = "ارسال با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
