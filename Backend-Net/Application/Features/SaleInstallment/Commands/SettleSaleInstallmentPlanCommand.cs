using Application.Common.Ledger;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Features.SaleInstallment.Mappings;
using Common.Exceptions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.SaleInstallment.Commands
{
    /// <summary>
    /// تسویه‌ی کامل زودهنگام: تمام سطرهای پرداخت‌نشده با یک PaymentDetail یکجا پرداخت‌شده
    /// علامت می‌خورند.
    ///
    /// TODO (تخفیف تسویه‌ی زودهنگام): مبلغ دقیقاً <c>plan.RemainingAmount</c> است، بدون هیچ
    /// تخفیفی روی درصد افزایش. اگر بعداً تصمیم شد بخشی از افزایش برگردد، تنها جایی که تغییر
    /// می‌کند محاسبه‌ی مبلغ در همین handler است (به‌علاوه‌ی احتمالاً یک فیلد
    /// <c>EarlySettlementDiscountAmount</c> روی پلن برای ثبت مقدار برگشتی). جزئیات در
    /// docs/sale-installment-guide.fa.md بخش «موارد باز».
    /// </summary>
    public class SettleSaleInstallmentPlanCommand : IRequest<ResponseDto>
    {
        public int? SaleId { get; set; }
        public int? PlanId { get; set; }
        public PaymentTypeEnum PaymentType { get; set; }
        public string? CheckNumber { get; set; }
        public string? TransferRef { get; set; }
        public DateTime? PaidAt { get; set; }
    }

    public class SettleSaleInstallmentPlanCommandValidator : AbstractValidator<SettleSaleInstallmentPlanCommand>
    {
        public SettleSaleInstallmentPlanCommandValidator()
        {
            RuleFor(x => x).Must(x => x.SaleId.HasValue || x.PlanId.HasValue)
                .WithMessage("شناسه‌ی فروش یا شناسه‌ی قرارداد اقساطی باید ارسال شود.");
        }
    }

    public class SettleSaleInstallmentPlanCommandHandler : IRequestHandler<SettleSaleInstallmentPlanCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public SettleSaleInstallmentPlanCommandHandler(IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(SettleSaleInstallmentPlanCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var plan = await _context.SaleInstallmentPlans
                .Include(x => x.Installments)
                .Include(x => x.Sale)
                .Where(x => request.PlanId.HasValue
                    ? x.Id == request.PlanId.Value
                    : x.SaleId == request.SaleId!.Value && x.IsActive && x.Status == SaleInstallmentPlanStatusEnum.ACTIVE)
                .FirstOrDefaultAsync(cancellationToken)
                ?? throw new NotFoundCustomException("قرارداد اقساطی مورد نظر یافت نشد.");

            if (plan.Status != SaleInstallmentPlanStatusEnum.ACTIVE || !plan.IsActive)
                throw new ValidationCustomException("قرارداد اقساطی جاری نیست و تسویه روی آن ثبت نمی‌شود.");

            var unpaid = plan.Installments
                .Where(i => i.Status == SaleInstallmentStatusEnum.PENDING || i.Status == SaleInstallmentStatusEnum.OVERDUE)
                .OrderBy(i => i.Number)
                .ToList();

            if (unpaid.Count == 0)
                throw new ValidationCustomException("قسط پرداخت‌نشده‌ای برای تسویه وجود ندارد.");

            var paidAt = request.PaidAt ?? DateTime.Now;
            var now = DateTime.Now;

            var payment = new Domain.Entities.PaymentDetail
            {
                SaleId = plan.SaleId,
                Type = request.PaymentType,
                Purpose = PaymentPurposeEnum.INSTALLMENT,
                Direction = PaymentDirectionEnum.IN,
                // بدون تخفیف - همان باقیمانده‌ی قرارداد.
                Amount = plan.RemainingAmount,
                PaidAt = paidAt,
                CheckNumber = request.CheckNumber,
                TransferRef = request.TransferRef,
            };
            await _context.PaymentDetails.AddAsync(payment, cancellationToken);
            await PartyLedger.SalePaymentAsync(_context, plan.Sale, payment, cancellationToken);

            foreach (var installment in unpaid)
            {
                installment.Status = SaleInstallmentStatusEnum.PAID;
                installment.PaidAt = paidAt;
                installment.PaymentType = request.PaymentType;
                installment.PaymentDetail = payment;
                installment.UpdatedAt = now;
            }

            plan.Status = SaleInstallmentPlanStatusEnum.SETTLED;
            plan.UpdatedAt = now;
            plan.Sale.PaidAmount = plan.TotalAmount;
            plan.Sale.UpdatedAt = now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await SaleInstallmentPlanReader.ReadAsync(_context, plan.Id, cancellationToken);
            res.Message = "تسویه‌ی کامل قرارداد اقساطی با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
