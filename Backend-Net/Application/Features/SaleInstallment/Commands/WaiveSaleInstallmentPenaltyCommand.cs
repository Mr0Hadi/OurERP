using Application.Common.Audit;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Installments;
using Application.Features.SaleInstallment.Mappings;
using Common.Exceptions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.SaleInstallment.Commands
{
    /// <summary>
    /// Forgives (part of) an unpaid installment's late penalty before it is paid: the amount is taken off whatever penalty
    /// has accrued when it is paid. It replaces any earlier waiver on the row; 0 cancels it. A reason is required. Its own
    /// permission (SaleInstallmentPenaltyWaive), because it gives money away. Answers with the plan.
    /// </summary>
    [AuditAction(AuditActionEnum.WaiveSaleInstallmentPenalty)]
    public class WaiveSaleInstallmentPenaltyCommand : IRequest<ResponseDto>
    {
        public int SaleInstallmentId { get; set; }

        /// <summary>Rials forgiven. A very large number forgives the whole penalty, however long it runs.</summary>
        public UInt64 Amount { get; set; }
        public string? Reason { get; set; }
    }

    public class WaiveSaleInstallmentPenaltyCommandValidator : AbstractValidator<WaiveSaleInstallmentPenaltyCommand>
    {
        public WaiveSaleInstallmentPenaltyCommandValidator()
        {
            RuleFor(x => x.SaleInstallmentId).GreaterThan(0).WithMessage("قسط نامعتبر است.");
            RuleFor(x => x.Reason).Must(r => !string.IsNullOrWhiteSpace(r)).When(x => x.Amount > 0)
                .WithMessage("دلیل بخشودگی جریمه را بنویسید.");
            RuleFor(x => x.Reason).MaximumLength(500).WithMessage("دلیل حداکثر ۵۰۰ نویسه است.");
        }
    }

    public class WaiveSaleInstallmentPenaltyCommandHandler : IRequestHandler<WaiveSaleInstallmentPenaltyCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public WaiveSaleInstallmentPenaltyCommandHandler(IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(WaiveSaleInstallmentPenaltyCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var installment = await _context.SaleInstallments
                .Include(x => x.Plan)
                .FirstOrDefaultAsync(x => x.Id == request.SaleInstallmentId, cancellationToken)
                ?? throw new NotFoundCustomException("قسط مورد نظر یافت نشد.");

            if (!InstallmentRules.IsUnpaid(installment) || installment.Plan.Status != SaleInstallmentPlanStatusEnum.ACTIVE || !installment.Plan.IsActive)
                throw new ValidationCustomException("جریمه فقط برای قسط پرداخت‌نشده‌ی قرارداد جاری بخشوده می‌شود.");

            installment.PenaltyWaivedAmount = request.Amount;
            installment.PenaltyWaiveReason = request.Amount > 0 ? request.Reason!.Trim() : null;
            installment.UpdatedAt = DateTime.Now;
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await SaleInstallmentPlanReader.ReadAsync(_context, installment.SaleInstallmentPlanId, cancellationToken);
            res.Message = request.Amount > 0 ? "بخشودگی جریمه ثبت شد." : "بخشودگی جریمه برداشته شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
