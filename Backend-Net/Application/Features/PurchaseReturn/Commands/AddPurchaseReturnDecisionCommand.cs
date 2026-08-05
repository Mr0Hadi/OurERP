using Application.Common.Contracts.Context;
using Application.Common.Contracts.PurchaseReturn;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Common.Exceptions;
using Common.Extensions;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.PurchaseReturn.Commands
{
    public class AddPurchaseReturnDecisionCommand : IRequest<ResponseDto>
    {
        public int PurchaseReturnItemId { get; set; }
        public PurchaseReturnDecisionTypeEnum DecisionType { get; set; }
        public int Quantity { get; set; }
        public UInt64? RefundAmount { get; set; }
        public string? Note { get; set; }
    }

    public class AddPurchaseReturnDecisionCommandValidator : AbstractValidator<AddPurchaseReturnDecisionCommand>
    {
        public AddPurchaseReturnDecisionCommandValidator()
        {
            RuleFor(x => x.PurchaseReturnItemId).GreaterThan(0).WithMessage(Validation.RequiredMessage("قلم مرجوعی"));
            RuleFor(x => x.Quantity).GreaterThan(0).WithMessage("مقدار تصمیم باید از صفر بیشتر باشد.");
            RuleFor(x => x.DecisionType).IsInEnum().WithMessage("نوع تصمیم نامعتبر است.");
            RuleFor(x => x.RefundAmount).Must(a => !a.HasValue || a.Value > 0).WithMessage("مبلغ باید از صفر بیشتر باشد.");
        }
    }

    public class AddPurchaseReturnDecisionCommandHandler : IRequestHandler<AddPurchaseReturnDecisionCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IPurchaseReturnCalculationService _purchaseReturnCalculationService;
        private readonly IUnitOfWork _unitOfWork;

        public AddPurchaseReturnDecisionCommandHandler(IWMSDbContext context, IPurchaseReturnCalculationService purchaseReturnCalculationService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _purchaseReturnCalculationService = purchaseReturnCalculationService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(AddPurchaseReturnDecisionCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var purchaseReturnItem = await _context.PurchaseReturnItems
                .Include(x => x.PurchaseReturn)
                    .ThenInclude(x => x.Items)
                        .ThenInclude(x => x.Decisions)
                .Include(x => x.PurchaseReturn)
                    .ThenInclude(x => x.Purchase)
                        .ThenInclude(x => x.Items)
                .FirstOrDefaultAsync(x => x.Id == request.PurchaseReturnItemId, cancellationToken) ?? throw new NotFoundCustomException("قلم مرجوعی مورد نظر یافت نشد.");

            var purchaseReturn = purchaseReturnItem.PurchaseReturn!;
            var purchase = purchaseReturn.Purchase!;

            if (purchaseReturn.Status == PurchaseReturnStatusEnum.RESOLVED || _purchaseReturnCalculationService.IsTerminal(purchaseReturn.Status))
                throw new ValidationCustomException("این مرجوعی قابل تغییر نیست.");

            var allocated = purchaseReturnItem.Decisions.Sum(x => x.Quantity);
            var remaining = purchaseReturnItem.Quantity - allocated;

            if (request.Quantity > remaining)
                throw new ValidationCustomException("مجموع تصمیم‌های ثبت‌شده از تعداد قلم مرجوعی بیشتر است.");

            if (!_purchaseReturnCalculationService.IsValidDecision(purchaseReturnItem.IssueType, request.DecisionType))
                throw new ValidationCustomException("نوع تصمیم برای این مغایرت معتبر نیست.");

            var isReplacement = request.DecisionType == PurchaseReturnDecisionTypeEnum.REPLACEMENT;
            var now = DateTime.Now;
            UInt64? refundAmount = request.DecisionType == PurchaseReturnDecisionTypeEnum.REFUND
                ? request.RefundAmount ?? (UInt64)request.Quantity * purchaseReturnItem.UnitPrice
                : null;

            purchaseReturnItem.Decisions.Add(new PurchaseReturnDecision
            {
                DecisionType = request.DecisionType,
                Quantity = request.Quantity,
                RefundAmount = refundAmount,
                Status = isReplacement ? PurchaseReturnDecisionStatusEnum.AWAITING : PurchaseReturnDecisionStatusEnum.RESOLVED,
                Note = request.Note,
                CreatedAt = now,
                ResolvedAt = isReplacement ? null : now,
            });

            if (!isReplacement)
            {
                var purchaseItem = purchase.Items.First(x => x.Id == purchaseReturnItem.PurchaseItemId);
                purchaseItem.SettledQuantity += request.Quantity;
            }

            purchaseReturn.Status = _purchaseReturnCalculationService.RecomputeReturnStatus(purchaseReturn);
            purchaseReturn.UpdatedAt = now;

            purchase.Status = _purchaseReturnCalculationService.RecomputePurchaseStatus(purchase, purchaseReturn);
            purchase.UpdatedAt = now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = new { ReturnId = purchaseReturn.Id, ReturnStatus = purchaseReturn.Status };
            res.Message = "تصمیم برای این قلم با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
