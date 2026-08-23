using Application.Common.Contracts.Context;
using Application.Common.Contracts.SaleReturn;
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

namespace Application.Features.SaleReturn.Commands
{
    public class AddSaleReturnDecisionCommand : IRequest<ResponseDto>
    {
        public int SaleReturnItemId { get; set; }
        public SaleReturnDecisionTypeEnum DecisionType { get; set; }
        public int Quantity { get; set; }
        public UInt64? RefundAmount { get; set; }
        public string? Note { get; set; }
    }

    public class AddSaleReturnDecisionCommandValidator : AbstractValidator<AddSaleReturnDecisionCommand>
    {
        public AddSaleReturnDecisionCommandValidator()
        {
            RuleFor(x => x.SaleReturnItemId).GreaterThan(0).WithMessage(Validation.RequiredMessage("قلم بازرسی‌شده"));
            RuleFor(x => x.Quantity).GreaterThan(0).WithMessage("مقدار تصمیم باید از صفر بیشتر باشد.");
            RuleFor(x => x.DecisionType).IsInEnum().WithMessage("نوع تصمیم نامعتبر است.");
            RuleFor(x => x.RefundAmount).Must(a => !a.HasValue || a.Value > 0).WithMessage("مبلغ باید از صفر بیشتر باشد.");
        }
    }

    public class AddSaleReturnDecisionCommandHandler : IRequestHandler<AddSaleReturnDecisionCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly ISaleReturnQueryService _saleReturnQueryService;
        private readonly ISaleReturnCalculationService _saleReturnCalculationService;
        private readonly IUnitOfWork _unitOfWork;

        public AddSaleReturnDecisionCommandHandler(IWMSDbContext context, ISaleReturnQueryService saleReturnQueryService, ISaleReturnCalculationService saleReturnCalculationService, IUnitOfWork unitOfWork)
        {
            _context = context;
            _saleReturnQueryService = saleReturnQueryService;
            _saleReturnCalculationService = saleReturnCalculationService;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(AddSaleReturnDecisionCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            // Loaded from the return down (rather than from the inspected line up) so the whole
            // graph RecomputeReturnStatus needs comes from one Include spine.
            var saleReturn = await _saleReturnQueryService.WithReturnGraph(_context.SaleReturns, includeSaleItems: true)
                .FirstOrDefaultAsync(x => x.Claims.Any(c => c.InspectionItems.Any(i => i.Id == request.SaleReturnItemId)), cancellationToken)
                    ?? throw new NotFoundCustomException("قلم بازرسی‌شده مورد نظر یافت نشد.");

            var claim = saleReturn.Claims.First(c => c.InspectionItems.Any(i => i.Id == request.SaleReturnItemId));
            var saleReturnItem = claim.InspectionItems.First(i => i.Id == request.SaleReturnItemId);
            var sale = saleReturn.Sale!;

            if (!_saleReturnCalculationService.IsMutable(saleReturn))
                throw new ValidationCustomException("این مرجوعی قابل تغییر نیست.");

            if (request.Quantity > saleReturnItem.UndecidedQuantity)
                throw new ValidationCustomException("مجموع تصمیم‌های ثبت‌شده از مقدار بازرسی‌شده این قلم بیشتر است.");

            if (!_saleReturnCalculationService.IsValidDecision(saleReturnItem.IssueType, request.DecisionType))
                throw new ValidationCustomException("نوع تصمیم برای این مشکل معتبر نیست.");

            var isReplacement = request.DecisionType == SaleReturnDecisionTypeEnum.REPLACEMENT;
            var now = DateTime.Now;
            UInt64? refundAmount = request.DecisionType == SaleReturnDecisionTypeEnum.REFUND
                ? request.RefundAmount ?? (UInt64)request.Quantity * claim.UnitPrice
                : null;

            saleReturnItem.Decisions.Add(new SaleReturnDecision
            {
                DecisionType = request.DecisionType,
                Quantity = request.Quantity,
                RefundAmount = refundAmount,
                Status = isReplacement ? SaleReturnDecisionStatusEnum.AWAITING : SaleReturnDecisionStatusEnum.RESOLVED,
                Note = request.Note,
                CreatedAt = now,
                ResolvedAt = isReplacement ? null : now,
            });

            if (!isReplacement)
            {
                var saleItem = sale.Items.First(x => x.Id == claim.SaleItemId);
                saleItem.SettledQuantity += request.Quantity;
            }

            saleReturn.Status = _saleReturnCalculationService.RecomputeReturnStatus(saleReturn);
            saleReturn.UpdatedAt = now;

            sale.Status = _saleReturnCalculationService.RecomputeSaleStatus(sale);
            sale.UpdatedAt = now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = new { ReturnId = saleReturn.Id, ReturnStatus = saleReturn.Status };
            res.Message = "تصمیم برای این قلم با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
