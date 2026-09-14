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
    // Replaces RemoveSaleReturnDecisionCommand. Only removable while untouched - the frontend's
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
        private readonly ISaleReturnCalculationService _saleReturnCalculationService;
        private readonly IInventoryCostingService _inventoryCostingService;
        private readonly IUnitOfWork _unitOfWork;

        public RemoveClaimResolutionCommandHandler(IWMSDbContext context, ISaleReturnCalculationService saleReturnCalculationService, IInventoryCostingService inventoryCostingService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _saleReturnCalculationService = saleReturnCalculationService;
            _inventoryCostingService = inventoryCostingService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(RemoveClaimResolutionCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var saleReturn = await _context.SaleReturns.Where(x => x.Claims.Any(c => c.Resolutions.Any(r => r.Id == request.Id)))
                .WhereNotDeleted()
                .WithReturnGraph()
                .WithSaleItems()
                .FirstOrDefaultAsync(cancellationToken) ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

            // No SETTLED gate here (unlike Add/lifecycle commands): a money-only resolution can
            // settle the return immediately with nothing physically moved yet, and removing it must
            // stay legal in that case - the frontend's only rule is "no goods effect has AppliedQuantity > 0".
            if (_saleReturnCalculationService.IsTerminal(saleReturn.Status))
                throw new ValidationCustomException(ReturnLifecycleRules.NotEditableMessage(saleReturn.Status));

            var claim = saleReturn.Claims.First(c => c.Resolutions.Any(r => r.Id == request.Id));
            var resolution = claim.Resolutions.First(r => r.Id == request.Id);

            if (resolution.Effects.Any(e => ReturnEffectDirections.IsGoods(e.Direction) && e.AppliedQuantity > 0))
                throw new ValidationCustomException("بخشی از کالای این تصمیم جابه‌جا شده و دیگر قابل لغو نیست.");

            // Fully-settled resolutions (no PENDING effect) already bumped SettledQuantity when
            // they were created - roll that back since nothing has physically moved yet.
            var wasFullySettled = resolution.Effects.All(e => e.Status != ReturnEffectStatusEnum.PENDING);
            // ON_ORDER only, mirroring AddClaimResolution: an EXCESS claim never settled its line.
            if (wasFullySettled && claim.OnOrderSaleItemId is int saleItemId)
            {
                var saleItem = saleReturn.Sale!.Items.First(x => x.Id == saleItemId);
                saleItem.SettledQuantity -= resolution.Quantity;
            }

            var now = DateTime.Now;

            // Every APPLIED money effect has a revenue row. Removing the resolution is the documented way out
            // of a money-locked return (see ReturnLifecycleRules), so it writes the opposite row - otherwise a
            // cancelled return keeps moving the sale report's revenue. A PENDING one never wrote anything.
            foreach (var money in resolution.Effects.Where(e => e.Direction is ReturnEffectDirectionEnum.MONEY_IN or ReturnEffectDirectionEnum.MONEY_OUT && e.Status == ReturnEffectStatusEnum.APPLIED))
                await _inventoryCostingService.RecordSaleReturnMoneyReversalAsync(claim.Product!, money.Direction, money.Amount!.Value, claim.Id, now, cancellationToken);

            claim.Resolutions.Remove(resolution);
            _context.SaleReturnResolutions.Remove(resolution);

            saleReturn.Status = _saleReturnCalculationService.RecomputeReturnStatus(saleReturn);
            saleReturn.UpdatedAt = now;

            var sale = saleReturn.Sale!;
            sale.Status = _saleReturnCalculationService.RecomputeSaleStatus(sale);
            sale.UpdatedAt = now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await SaleReturnDetailReader.ReadAsync(_context, _saleReturnCalculationService, saleReturn.Id, cancellationToken);
            res.Message = "تصمیم با موفقیت حذف شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
