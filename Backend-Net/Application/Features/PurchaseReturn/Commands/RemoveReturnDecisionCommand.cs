using Application.Common.Contracts.Context;
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
    public class RemoveReturnDecisionCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class RemoveReturnDecisionCommandValidator : AbstractValidator<RemoveReturnDecisionCommand>
    {
        public RemoveReturnDecisionCommandValidator()
        {
            RuleFor(x => x.Id).GreaterThan(0).WithMessage("شناسه تصمیم معتبر نیست.");
        }
    }

    public class RemoveReturnDecisionCommandHandler : IRequestHandler<RemoveReturnDecisionCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public RemoveReturnDecisionCommandHandler(IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(RemoveReturnDecisionCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchaseReturn = await _context.PurchaseReturns
                .Include(x => x.Items)
                .ThenInclude(x => x.Decisions)
                .Include(x => x.Purchase)
                .ThenInclude(x => x.Items)
                .FirstOrDefaultAsync(x => x.Items.Any(i => i.Decisions.Any(d => d.Id == request.Id)))
                ?? throw new NotFoundCustomException("تصمیم مورد نظر یافت نشد.");

            if (purchaseReturn.Status == Domain.Enums.PurchaseReturnStatusEnum.RESOLVED ||
                purchaseReturn.Status == Domain.Enums.PurchaseReturnStatusEnum.REJECTED ||
                purchaseReturn.Status == Domain.Enums.PurchaseReturnStatusEnum.CANCELLED)
                throw new ValidationCustomException("این مرجوعی قابل تغییر نیست.");

            var decision = purchaseReturn.Items
                .SelectMany(x => x.Decisions ?? new List<Domain.Entities.PurchaseReturnDecision>())
                .First(x => x.Id == request.Id);

            var returnItem = purchaseReturn.Items.First(x => x.Decisions != null && x.Decisions.Contains(decision));
            returnItem.Decisions.Remove(decision);

            purchaseReturn.Status = PurchaseReturnStatusUpdater.RecomputeReturnStatus(purchaseReturn);
            purchaseReturn.UpdatedAt = DateTime.Now;

            purchaseReturn.Purchase.Status = PurchaseReturnStatusUpdater.RecomputePurchaseStatus(purchaseReturn.Purchase, purchaseReturn);
            purchaseReturn.Purchase.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            res.Message = "تصمیم با موفقیت حذف شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
