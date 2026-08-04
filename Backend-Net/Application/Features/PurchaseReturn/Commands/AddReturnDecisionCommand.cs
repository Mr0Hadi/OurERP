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
    public class AddReturnDecisionCommand : IRequest<ResponseDto>
    {
        public int ReturnId { get; set; }
        public int ReturnItemId { get; set; }
        public PurchaseReturnDecisionTypeEnum DecisionType { get; set; }
        public int Quantity { get; set; }
        public UInt64 RefundAmount { get; set; }
        public string? Note { get; set; }
    }

    public class AddReturnDecisionCommandValidator : AbstractValidator<AddReturnDecisionCommand>
    {
        public AddReturnDecisionCommandValidator()
        {
            RuleFor(x => x.ReturnId).GreaterThan(0).WithMessage(Validation.RequiredMessage("مرجوعی"));
            RuleFor(x => x.ReturnItemId).GreaterThan(0).WithMessage(Validation.RequiredMessage("قلم مرجوعی"));
            RuleFor(x => x.Quantity).GreaterThan(0).WithMessage("تعداد تصمیم باید بیشتر از صفر باشد.");
            RuleFor(x => x.RefundAmount).Must(x => x >= 0).WithMessage("مبلغ بازگشتی باید بیشتر یا مساوی صفر باشد.");
        }
    }

    public class AddReturnDecisionCommandHandler : IRequestHandler<AddReturnDecisionCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public AddReturnDecisionCommandHandler(IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(AddReturnDecisionCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchaseReturn = await _context.PurchaseReturns
                .Include(x => x.Items)
                .ThenInclude(x => x.Decisions)
                .Include(x => x.Purchase)
                .ThenInclude(x => x.Items)
                .FirstOrDefaultAsync(x => x.Id == request.ReturnId) ?? throw new NotFoundCustomException("مرجوعی مورد نظر یافت نشد.");

            if (purchaseReturn.Status == Domain.Enums.PurchaseReturnStatusEnum.RESOLVED ||
                purchaseReturn.Status == Domain.Enums.PurchaseReturnStatusEnum.REJECTED ||
                purchaseReturn.Status == Domain.Enums.PurchaseReturnStatusEnum.CANCELLED)
                throw new ValidationCustomException("این مرجوعی قابل تغییر نیست.");

            var returnItem = purchaseReturn.Items.FirstOrDefault(x => x.Id == request.ReturnItemId)
                ?? throw new NotFoundCustomException("قلم مرجوعی مورد نظر یافت نشد.");

            var decidedQuantity = (returnItem.Decisions ?? new List<Domain.Entities.PurchaseReturnDecision>()).Sum(x => x.Quantity);
            if (decidedQuantity + request.Quantity > returnItem.Quantity)
                throw new ValidationCustomException("مجموع تصمیم‌های ثبت‌شده از تعداد قلم مرجوعی بیشتر است.");

            returnItem.Decisions ??= new List<Domain.Entities.PurchaseReturnDecision>();
            returnItem.Decisions.Add(new Domain.Entities.PurchaseReturnDecision
            {
                PurchaseReturnItemId = returnItem.Id,
                DecisionType = request.DecisionType,
                Quantity = request.Quantity,
                RefundAmount = request.RefundAmount,
                Status = request.DecisionType == PurchaseReturnDecisionTypeEnum.REPLACEMENT
                    ? PurchaseReturnDecisionStatusEnum.AWAITING
                    : PurchaseReturnDecisionStatusEnum.RESOLVED,
                Note = request.Note,
                CreatedAt = DateTime.Now,
            });

            purchaseReturn.Status = PurchaseReturnStatusUpdater.RecomputeReturnStatus(purchaseReturn);
            purchaseReturn.UpdatedAt = DateTime.Now;

            purchaseReturn.Purchase.Status = PurchaseReturnStatusUpdater.RecomputePurchaseStatus(purchaseReturn.Purchase, purchaseReturn);
            purchaseReturn.Purchase.UpdatedAt = DateTime.Now;

            await _unitOfWork.SaveChangesAsync();

            res.Data = new { ReturnId = purchaseReturn.Id, ReturnStatus = purchaseReturn.Status };
            res.Message = "تصمیم برای این قلم با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
