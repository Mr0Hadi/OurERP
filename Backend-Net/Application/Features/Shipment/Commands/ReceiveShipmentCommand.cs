using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using PurchaseCommands = Application.Features.Purchase.Commands;
using PurchaseReturnCommands = Application.Features.PurchaseReturn.Commands;
using SaleReturnCommands = Application.Features.SaleReturn.Commands;

namespace Application.Features.Shipment.Commands
{
    // One inbound vehicle, recorded atomically: order lines of a purchase, replacement goods for purchase returns, and goods a
    // customer sends back, all in one transaction. Each part is the existing command, sent unchanged through MediatR (so its own
    // validator and rules apply); a failure in any part rolls every part back, so a retry of the whole receipt can never add the
    // first part's stock twice. Inbound only: every return round line must target a GOODS_IN effect.
    public class ReceiveShipmentCommand : IRequest<ResponseDto>
    {
        public PurchaseCommands.ReceivePurchaseCommand? Purchase { get; set; }
        public List<PurchaseReturnCommands.ExecuteGoodsRoundCommand> PurchaseReturnRounds { get; set; } = new();
        public List<SaleReturnCommands.ExecuteGoodsRoundCommand> SaleReturnRounds { get; set; } = new();
    }

    public class ReceiveShipmentCommandValidator : AbstractValidator<ReceiveShipmentCommand>
    {
        public ReceiveShipmentCommandValidator()
        {
            RuleFor(x => x).Must(x => x.Purchase != null || (x.PurchaseReturnRounds?.Count ?? 0) > 0 || (x.SaleReturnRounds?.Count ?? 0) > 0)
                .WithMessage("رسید باید دست‌کم شامل دریافت خرید یا یک مرحله‌ی کالای مرجوعی باشد.");
        }
    }

    public class ReceiveShipmentCommandHandler : IRequestHandler<ReceiveShipmentCommand, ResponseDto>
    {
        private readonly IMediator _mediator;
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public ReceiveShipmentCommandHandler(IMediator mediator, IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _mediator = mediator;
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(ReceiveShipmentCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();
            var purchaseReturnRounds = request.PurchaseReturnRounds ?? new();
            var saleReturnRounds = request.SaleReturnRounds ?? new();

            await ShipmentDirections.EnsureAsync(_context, ReturnEffectDirectionEnum.GOODS_IN,
                purchaseReturnRounds.SelectMany(r => r.Rounds ?? new()).Select(l => l.EffectId),
                saleReturnRounds.SelectMany(r => r.Rounds ?? new()).Select(l => l.EffectId),
                "رسید فقط ورود کالا را ثبت می‌کند؛ اثرهای خروجی را با ارسال (DispatchShipment) اجرا کنید.",
                cancellationToken);

            res.Data = await _unitOfWork.ExecuteInTransactionAsync(async ct =>
            {
                var purchase = request.Purchase != null ? (await _mediator.Send(request.Purchase, ct)).Data : null;

                var purchaseReturns = new List<object?>();
                foreach (var round in purchaseReturnRounds)
                    purchaseReturns.Add((await _mediator.Send(round, ct)).Data);

                var saleReturns = new List<object?>();
                foreach (var round in saleReturnRounds)
                    saleReturns.Add((await _mediator.Send(round, ct)).Data);

                return new { Purchase = purchase, PurchaseReturns = purchaseReturns, SaleReturns = saleReturns };
            }, cancellationToken);

            res.Message = "رسید با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }

    /// <summary>Shared by the receive and dispatch commands: every targeted effect must move goods in the command's direction.</summary>
    internal static class ShipmentDirections
    {
        public static async Task EnsureAsync(IWMSDbContext context, ReturnEffectDirectionEnum direction, IEnumerable<int> purchaseReturnEffectIds, IEnumerable<int> saleReturnEffectIds, string message, CancellationToken cancellationToken)
        {
            var purchaseIds = purchaseReturnEffectIds.Distinct().ToList();
            var saleIds = saleReturnEffectIds.Distinct().ToList();

            // Ids that do not exist are left for the inner command to refuse with its own 404.
            var wrong = (purchaseIds.Count > 0 && await context.PurchaseReturnEffects.AnyAsync(e => purchaseIds.Contains(e.Id) && e.Direction != direction, cancellationToken))
                || (saleIds.Count > 0 && await context.SaleReturnEffects.AnyAsync(e => saleIds.Contains(e.Id) && e.Direction != direction, cancellationToken));

            if (wrong)
                throw new ValidationCustomException(message);
        }
    }
}
