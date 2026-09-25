using Application.Common.Ledger;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.InventoryCosting;
using Application.Common.Contracts.SaleReturn;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Application.Common.Returns;
using Application.Features.SaleReturn.Queries;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.SaleReturn.Commands
{
    // Records that a promised (PENDING) money effect has actually been paid - the money counterpart of
    // ExecuteGoodsRoundCommand. The effect becomes APPLIED, its ledger row is written at PaidAt, and when it
    // was the resolution's last pending effect the claimed quantity settles on the order line.
    public class ExecuteMoneyEffectCommand : IRequest<ResponseDto>
    {
        public int EffectId { get; set; }

        /// <summary>When the money moved. Defaults to now.</summary>
        public DateTime? PaidAt { get; set; }

        /// <summary>Replaces the effect's reference (cheque number, transfer id) when sent.</summary>
        public string? Reference { get; set; }
    }

    public class ExecuteMoneyEffectCommandValidator : AbstractValidator<ExecuteMoneyEffectCommand>
    {
        public ExecuteMoneyEffectCommandValidator()
        {
            RuleFor(x => x.EffectId).GreaterThan(0).WithMessage(Validation.RequiredMessage("اثر"));
        }
    }

    public class ExecuteMoneyEffectCommandHandler : IRequestHandler<ExecuteMoneyEffectCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly ISaleReturnCalculationService _saleReturnCalculationService;
        private readonly IInventoryCostingService _inventoryCostingService;
        private readonly IUnitOfWork _unitOfWork;

        public ExecuteMoneyEffectCommandHandler(IWMSDbContext context, ISaleReturnCalculationService saleReturnCalculationService, IInventoryCostingService inventoryCostingService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _saleReturnCalculationService = saleReturnCalculationService;
            _inventoryCostingService = inventoryCostingService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(ExecuteMoneyEffectCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var saleReturn = await _context.SaleReturns.Where(x => x.Claims.Any(c => c.Resolutions.Any(r => r.Effects.Any(e => e.Id == request.EffectId))))
                .WhereNotDeleted()
                .WithReturnGraph()
                .WithSaleItems()
                .FirstOrDefaultAsync(cancellationToken) ?? throw new NotFoundCustomException("اثر مورد نظر یافت نشد.");

            if (_saleReturnCalculationService.IsTerminal(saleReturn.Status))
                throw new ValidationCustomException(ReturnLifecycleRules.NotEditableMessage(saleReturn.Status));

            var claim = saleReturn.Claims.First(c => c.Resolutions.Any(r => r.Effects.Any(e => e.Id == request.EffectId)));
            var resolution = claim.Resolutions.First(r => r.Effects.Any(e => e.Id == request.EffectId));
            var effect = resolution.Effects.First(e => e.Id == request.EffectId);

            if (effect.Direction is not (ReturnEffectDirectionEnum.MONEY_IN or ReturnEffectDirectionEnum.MONEY_OUT))
                throw new ValidationCustomException("فقط اثرهای مالی با این عملیات اجرا می‌شوند؛ کالا با اجرای مرحله‌ی کالا جابه‌جا می‌شود.");

            if (effect.Status != ReturnEffectStatusEnum.PENDING)
                throw new ValidationCustomException("این اثر مالی قبلاً اجرا شده است.");

            var now = DateTime.Now;
            var paidAt = request.PaidAt ?? now;

            effect.Status = ReturnEffectStatusEnum.APPLIED;
            effect.AppliedAt = paidAt;
            if (!string.IsNullOrWhiteSpace(request.Reference))
                effect.Reference = request.Reference;

            await _inventoryCostingService.RecordSaleReturnMoneyAsync(claim.Product!, effect.Direction, effect.Amount!.Value, claim.Id, paidAt, cancellationToken);
            await PartyLedger.SaleReturnMoneyAsync(_context, saleReturn.Sale!, saleReturn.ReturnNumber, claim.Id, effect, reversal: false, paidAt, cancellationToken);

            // Mirrors ExecuteGoodsRound: the transition that clears a resolution's last pending effect settles
            // its quantity. ON_ORDER only - an EXCESS claim never settles its line.
            if (resolution.Effects.All(e => e.Status != ReturnEffectStatusEnum.PENDING) && claim.OnOrderSaleItemId is int saleItemId)
            {
                var saleItem = saleReturn.Sale!.Items.First(x => x.Id == saleItemId);
                saleItem.SettledQuantity += resolution.Quantity;
            }

            saleReturn.Status = _saleReturnCalculationService.RecomputeReturnStatus(saleReturn);
            saleReturn.UpdatedAt = now;

            var sale = saleReturn.Sale!;
            sale.Status = _saleReturnCalculationService.RecomputeSaleStatus(sale);
            sale.UpdatedAt = now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await SaleReturnDetailReader.ReadAsync(_context, _saleReturnCalculationService, saleReturn.Id, cancellationToken);
            res.Message = "پرداخت با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
