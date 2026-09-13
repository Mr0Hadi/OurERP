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
    // Replaces RemovePurchaseReturnDecisionCommand. Only removable while untouched - the frontend's
    // exact rule: none of the resolution's goods effects may have any AppliedQuantity yet.
    public class RemoveClaimResolutionCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class RemoveClaimResolutionCommandValidator : AbstractValidator<RemoveClaimResolutionCommand>
    {
        public RemoveClaimResolutionCommandValidator()
        {
            RuleFor(x => x.Id).GreaterThan(0).WithMessage(Validation.RequiredMessage("تصمیم"));
        }
    }

    public class RemoveClaimResolutionCommandHandler : IRequestHandler<RemoveClaimResolutionCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IPurchaseReturnCalculationService _purchaseReturnCalculationService;
        private readonly IInventoryCostingService _inventoryCostingService;
        private readonly IObjectStorageService _objectStorageService;
        private readonly IUnitOfWork _unitOfWork;

        public RemoveClaimResolutionCommandHandler(IWMSDbContext context, IPurchaseReturnCalculationService purchaseReturnCalculationService, IInventoryCostingService inventoryCostingService, IObjectStorageService objectStorageService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _purchaseReturnCalculationService = purchaseReturnCalculationService;
            _inventoryCostingService = inventoryCostingService;
            _objectStorageService = objectStorageService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(RemoveClaimResolutionCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchaseReturn = await _context.PurchaseReturns.Where(x => x.Claims.Any(c => c.Resolutions.Any(r => r.Id == request.Id)))
                .WhereNotDeleted()
                .WithReturnGraph()
                .WithPurchaseItems()
                .FirstOrDefaultAsync(cancellationToken) ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

            // No SETTLED gate here (unlike Add/lifecycle commands): a money-only resolution can
            // settle the return immediately with nothing physically moved yet, and removing it must
            // stay legal in that case - the frontend's only rule is "no goods effect has AppliedQuantity > 0".
            if (_purchaseReturnCalculationService.IsTerminal(purchaseReturn.Status))
                throw new ValidationCustomException(ReturnLifecycleRules.NotEditableMessage(purchaseReturn.Status));

            var claim = purchaseReturn.Claims.First(c => c.Resolutions.Any(r => r.Id == request.Id));
            var resolution = claim.Resolutions.First(r => r.Id == request.Id);

            if (resolution.Effects.Any(e => e.Direction is ReturnEffectDirectionEnum.GOODS_IN or ReturnEffectDirectionEnum.GOODS_OUT && e.AppliedQuantity > 0))
                throw new ValidationCustomException("بخشی از کالای این تصمیم جابه‌جا شده و دیگر قابل لغو نیست.");

            // Fully-settled resolutions (no PENDING effect) already bumped SettledQuantity when
            // they were created - roll that back since nothing has physically moved yet.
            var wasFullySettled = resolution.Effects.All(e => e.Status != ReturnEffectStatusEnum.PENDING);
            // ON_ORDER only, mirroring AddClaimResolution: an EXCESS claim never settled its line.
            if (wasFullySettled && claim.OnOrderPurchaseItemId is int purchaseItemId)
            {
                var purchaseItem = purchaseReturn.Purchase!.Items.First(x => x.Id == purchaseItemId);
                purchaseItem.SettledQuantity -= resolution.Quantity;
            }

            var now = DateTime.Now;

            // AddClaimResolution wrote a revenue row for each money effect; the ledger is append-only, so
            // removing the resolution writes the opposite row.
            foreach (var money in resolution.Effects.Where(e => e.Direction is ReturnEffectDirectionEnum.MONEY_IN or ReturnEffectDirectionEnum.MONEY_OUT))
                await _inventoryCostingService.RecordPurchaseReturnMoneyReversalAsync(claim.Product!, money.Direction, money.Amount!.Value, claim.Id, now, cancellationToken);

            claim.Resolutions.Remove(resolution);
            _context.PurchaseReturnResolutions.Remove(resolution);

            purchaseReturn.Status = _purchaseReturnCalculationService.RecomputeReturnStatus(purchaseReturn);
            purchaseReturn.UpdatedAt = now;

            var purchase = purchaseReturn.Purchase!;
            purchase.Status = _purchaseReturnCalculationService.RecomputePurchaseStatus(purchase);
            purchase.UpdatedAt = now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await PurchaseReturnDetailReader.ReadAsync(_context, _purchaseReturnCalculationService, _objectStorageService, purchaseReturn.Id, cancellationToken);
            res.Message = "تصمیم با موفقیت حذف شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
