using Application.Common.Ledger;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.SaleInstallment.Mappings;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.SaleInstallment.Commands
{
    /// <summary>
    /// ابطال قرارداد اقساطی (soft delete). سطرهای پرداخت‌نشده CANCELLED می‌شوند و سطرهای PAID
    /// دست‌نخورده می‌مانند. PaymentDetailهای ثبت‌شده حذف نمی‌شوند - رکورد مالی واقعی‌اند - و
    /// به همین دلیل <c>Sale.PaidAmount</c> هم تغییر نمی‌کند.
    /// </summary>
    public class DeleteSaleInstallmentPlanCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
    }

    public class DeleteSaleInstallmentPlanCommandValidator : AbstractValidator<DeleteSaleInstallmentPlanCommand>
    {
        public DeleteSaleInstallmentPlanCommandValidator()
        {
            RuleFor(x => x.Id).GreaterThan(0).WithMessage(Validation.RequiredMessage("قرارداد اقساطی"));
        }
    }

    public class DeleteSaleInstallmentPlanCommandHandler : IRequestHandler<DeleteSaleInstallmentPlanCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public DeleteSaleInstallmentPlanCommandHandler(IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(DeleteSaleInstallmentPlanCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var plan = await _context.SaleInstallmentPlans
                .Include(x => x.Installments)
                .Include(x => x.Sale)
                .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken)
                ?? throw new NotFoundCustomException("قرارداد اقساطی مورد نظر یافت نشد.");

            if (plan.Status == SaleInstallmentPlanStatusEnum.CANCELLED || !plan.IsActive)
                throw new ValidationCustomException("این قرارداد اقساطی قبلاً ابطال شده است.");

            var now = DateTime.Now;

            foreach (var installment in plan.Installments
                .Where(i => i.Status == SaleInstallmentStatusEnum.PENDING || i.Status == SaleInstallmentStatusEnum.OVERDUE))
            {
                installment.Status = SaleInstallmentStatusEnum.CANCELLED;
                installment.UpdatedAt = now;
            }

            plan.IsActive = false;
            plan.Status = SaleInstallmentPlanStatusEnum.CANCELLED;
            plan.UpdatedAt = now;

            // A cancelled plan no longer adds its charge to what the customer owes.
            await PartyLedger.InstallmentChargeChangedAsync(_context, plan.Sale, 0UL, now, cancellationToken);

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await SaleInstallmentPlanReader.ReadAsync(_context, plan.Id, cancellationToken);
            res.Message = "قرارداد اقساطی ابطال شد. اقساط پرداخت‌نشده لغو شدند؛ پرداخت‌های ثبت‌شده و مبلغ پرداخت‌شده‌ی فروش دست‌نخورده باقی ماندند.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
