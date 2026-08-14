using Application.Common.Contracts.Context;
using Application.Common.Contracts.PurchaseReturn;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.PurchaseReturn.Commands
{
    public class RemovePurchaseReturnDecisionCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class RemovePurchaseReturnDecisionCommandValidator : AbstractValidator<RemovePurchaseReturnDecisionCommand>
    {
        public RemovePurchaseReturnDecisionCommandValidator()
        {
            RuleFor(x => x.Id).GreaterThan(0).WithMessage(Validation.RequiredMessage("تصمیم"));
        }
    }

    public class RemovePurchaseReturnDecisionCommandHandler : IRequestHandler<RemovePurchaseReturnDecisionCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IPurchaseReturnCalculationService _purchaseReturnCalculationService;
        private readonly IUnitOfWork _unitOfWork;

        public RemovePurchaseReturnDecisionCommandHandler(IWMSDbContext context, IPurchaseReturnCalculationService purchaseReturnCalculationService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _purchaseReturnCalculationService = purchaseReturnCalculationService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(RemovePurchaseReturnDecisionCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var decision = await _context.PurchaseReturnDecisions
                .Include(x => x.PurchaseReturnItem)
                    .ThenInclude(x => x.PurchaseReturn)
                        .ThenInclude(x => x.Items)
                            .ThenInclude(x => x.Decisions)
                .Include(x => x.PurchaseReturnItem)
                    .ThenInclude(x => x.PurchaseReturn)
                        .ThenInclude(x => x.Purchase)
                            .ThenInclude(x => x.Items)
                .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken) ?? throw new NotFoundCustomException("تصمیم مورد نظر یافت نشد.");

            var purchaseReturnItem = decision.PurchaseReturnItem!;
            var purchaseReturn = purchaseReturnItem.PurchaseReturn!;
            var purchase = purchaseReturn.Purchase!;

            if (purchaseReturn.Status == PurchaseReturnStatusEnum.RESOLVED || _purchaseReturnCalculationService.IsTerminal(purchaseReturn.Status))
                throw new ValidationCustomException("این مرجوعی قابل تغییر نیست.");

            if (decision.Status != PurchaseReturnDecisionStatusEnum.AWAITING)
                throw new ValidationCustomException("این تصمیم قطعی شده و دیگر قابل حذف نیست.");

            purchaseReturnItem.Decisions.Remove(decision);

            var now = DateTime.Now;
            purchaseReturn.Status = _purchaseReturnCalculationService.RecomputeReturnStatus(purchaseReturn);
            purchaseReturn.UpdatedAt = now;

            purchase.Status = _purchaseReturnCalculationService.RecomputePurchaseStatus(purchase, purchaseReturn);
            purchase.UpdatedAt = now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Message = "تصمیم با موفقیت حذف شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
