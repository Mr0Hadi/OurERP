using Application.Common.Ledger;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.InventoryCosting;
using Application.Common.Contracts.PurchaseReturn;
using Application.Common.Contracts.Storage;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Queries;
using Application.Common.Returns;
using Application.Features.PurchaseReturn.Queries;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.PurchaseReturn.Commands
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
        private readonly IPurchaseReturnCalculationService _purchaseReturnCalculationService;
        private readonly IInventoryCostingService _inventoryCostingService;
        private readonly IObjectStorageService _objectStorageService;
        private readonly IUnitOfWork _unitOfWork;

        public ExecuteMoneyEffectCommandHandler(IWMSDbContext context, IPurchaseReturnCalculationService purchaseReturnCalculationService, IInventoryCostingService inventoryCostingService, IObjectStorageService objectStorageService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _purchaseReturnCalculationService = purchaseReturnCalculationService;
            _inventoryCostingService = inventoryCostingService;
            _objectStorageService = objectStorageService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(ExecuteMoneyEffectCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchaseReturn = await _context.PurchaseReturns.Where(x => x.Claims.Any(c => c.Resolutions.Any(r => r.Effects.Any(e => e.Id == request.EffectId))))
                .WhereNotDeleted()
                .WithReturnGraph()
                .WithPurchaseItems()
                .FirstOrDefaultAsync(cancellationToken) ?? throw new NotFoundCustomException("اثر مورد نظر یافت نشد.");

            if (_purchaseReturnCalculationService.IsTerminal(purchaseReturn.Status))
                throw new ValidationCustomException(ReturnLifecycleRules.NotEditableMessage(purchaseReturn.Status));

            var claim = purchaseReturn.Claims.First(c => c.Resolutions.Any(r => r.Effects.Any(e => e.Id == request.EffectId)));
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

            await _inventoryCostingService.RecordPurchaseReturnMoneyAsync(claim.Product!, effect.Direction, effect.Amount!.Value, claim.Id, paidAt, cancellationToken);
            await PartyLedger.PurchaseReturnMoneyAsync(_context, purchaseReturn.Purchase!, purchaseReturn.ReturnNumber, claim.Id, effect, reversal: false, paidAt, cancellationToken);

            // Mirrors ExecuteGoodsRound: the transition that clears a resolution's last pending effect settles
            // its quantity. ON_ORDER only - an EXCESS claim never settles its line.
            if (resolution.Effects.All(e => e.Status != ReturnEffectStatusEnum.PENDING) && claim.OnOrderPurchaseItemId is int purchaseItemId)
            {
                var purchaseItem = purchaseReturn.Purchase!.Items.First(x => x.Id == purchaseItemId);
                purchaseItem.SettledQuantity += resolution.Quantity;
            }

            purchaseReturn.Status = _purchaseReturnCalculationService.RecomputeReturnStatus(purchaseReturn);
            purchaseReturn.UpdatedAt = now;

            var purchase = purchaseReturn.Purchase!;
            purchase.Status = _purchaseReturnCalculationService.RecomputePurchaseStatus(purchase);
            purchase.UpdatedAt = now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await PurchaseReturnDetailReader.ReadAsync(_context, _purchaseReturnCalculationService, _objectStorageService, purchaseReturn.Id, cancellationToken);
            res.Message = "پرداخت با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
