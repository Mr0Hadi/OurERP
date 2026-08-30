using Application.Common.Contracts.Context;
using Application.Common.Contracts.SaleReturn;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.SaleReturn.Commands
{
    // Replaces RemoveSaleReturnDecisionCommand. Only removable while untouched - the frontend's
    // exact rule: none of the resolution's goods effects may have any DoneQuantity yet.
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
        private readonly ISaleReturnQueryService _saleReturnQueryService;
        private readonly ISaleReturnCalculationService _saleReturnCalculationService;
        private readonly IUnitOfWork _unitOfWork;

        public RemoveClaimResolutionCommandHandler(IWMSDbContext context, ISaleReturnQueryService saleReturnQueryService, ISaleReturnCalculationService saleReturnCalculationService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _saleReturnQueryService = saleReturnQueryService;
            _saleReturnCalculationService = saleReturnCalculationService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(RemoveClaimResolutionCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var saleReturn = await _saleReturnQueryService
                .WithReturnGraph(_saleReturnQueryService.WhereNotDeleted(_context.SaleReturns).Where(x => x.Claims.Any(c => c.Resolutions.Any(r => r.Id == request.Id))), includeSaleItems: true)
                .FirstOrDefaultAsync(cancellationToken) ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

            // No SETTLED gate here (unlike Add/lifecycle commands): a money-only resolution can
            // settle the return immediately with nothing physically moved yet, and removing it must
            // stay legal in that case - the frontend's only rule is "no goods effect has DoneQuantity > 0".
            if (_saleReturnCalculationService.IsTerminal(saleReturn.Status))
                throw new ValidationCustomException("این مرجوعی دیگر قابل ویرایش نیست.");

            var claim = saleReturn.Claims.First(c => c.Resolutions.Any(r => r.Id == request.Id));
            var resolution = claim.Resolutions.First(r => r.Id == request.Id);

            if (resolution.Effects.Any(e => e.Kind is ReturnEffectKindEnum.GOODS_IN or ReturnEffectKindEnum.GOODS_OUT && e.DoneQuantity > 0))
                throw new ValidationCustomException("بخشی از کالای این تصمیم جابه‌جا شده و دیگر قابل لغو نیست.");

            // Fully-settled resolutions (no PENDING effect) already bumped SettledQuantity when
            // they were created - roll that back since nothing has physically moved yet.
            var wasFullySettled = resolution.Effects.All(e => e.Status != ReturnEffectStatusEnum.PENDING);
            if (wasFullySettled && claim.SaleItemId.HasValue)
            {
                var saleItem = saleReturn.Sale!.Items.First(x => x.Id == claim.SaleItemId.Value);
                saleItem.SettledQuantity -= resolution.Quantity;
            }

            claim.Resolutions.Remove(resolution);
            _context.SaleReturnResolutions.Remove(resolution);

            var now = DateTime.Now;
            saleReturn.Status = _saleReturnCalculationService.RecomputeReturnStatus(saleReturn);
            saleReturn.UpdatedAt = now;

            var sale = saleReturn.Sale!;
            sale.Status = _saleReturnCalculationService.RecomputeSaleStatus(sale);
            sale.UpdatedAt = now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Message = "تصمیم با موفقیت حذف شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
