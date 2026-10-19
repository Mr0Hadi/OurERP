using Application.Common.Ledger;
using Application.Common.Contracts.BankAccounts;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.Settings;
using Application.Common.Installments;
using Application.Common.Settings;
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
using Application.Common.Audit;

namespace Application.Features.SaleInstallment.Commands
{
    /// <summary>
    /// پرداخت یک قسط. یک قسط = یک پرداخت کامل؛ پرداخت جزئی وجود ندارد و مبلغ از روی
    /// <c>installment.Amount</c> برداشته می‌شود، نه از ورودی کاربر. پرداخت زودتر از سررسید و
    /// پرداخت خارج از ترتیب هر دو مجازند - سطر مشخصاً با <c>Id</c> هدف گرفته می‌شود.
    /// A late row also pays its penalty (InstallmentRules.PenaltyDue at PaidAt) in the same payment row: the row's Amount
    /// is installment + penalty, installment.PenaltyAmount records the penalty, and a LATE_PENALTY ledger row charges it.
    /// The penalty is never part of the plan's TotalAmount or PaidAmount.
    /// </summary>
    [AuditAction(AuditActionEnum.PaySaleInstallment)]
    public class PaySaleInstallmentCommand : IRequest<ResponseDto>
    {
        public int SaleInstallmentId { get; set; }
        public PaymentTypeEnum PaymentType { get; set; }
        public string? CheckNumber { get; set; }

        /// <summary>Cheque rows only: the date on the cheque, its bank and drawer (see PaymentInput).</summary>
        public DateTime? CheckDueDate { get; set; }
        public string? CheckBankName { get; set; }
        public string? CheckDrawerName { get; set; }
        public string? TransferRef { get; set; }

        /// <summary>The cash box or bank account the money went into (see PaymentInput.BankAccountId).</summary>
        public int? BankAccountId { get; set; }
        public DateTime? PaidAt { get; set; }
    }

    public class PaySaleInstallmentCommandValidator : AbstractValidator<PaySaleInstallmentCommand>
    {
        public PaySaleInstallmentCommandValidator()
        {
            RuleFor(x => x.SaleInstallmentId).GreaterThan(0).WithMessage(Validation.RequiredMessage("قسط"));
        }
    }

    public class PaySaleInstallmentCommandHandler : IRequestHandler<PaySaleInstallmentCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;
        private readonly IPaymentAccountResolver _paymentAccountResolver;
        private readonly ISystemSettingService _systemSettingService;

        public PaySaleInstallmentCommandHandler(IWMSDbContext context, IUnitOfWork unitOfWork, IPaymentAccountResolver paymentAccountResolver, ISystemSettingService systemSettingService)
        {
            _context = context;
            _unitOfWork = unitOfWork;
            _paymentAccountResolver = paymentAccountResolver;
            _systemSettingService = systemSettingService;
        }

        public async Task<ResponseDto> Handle(PaySaleInstallmentCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            // از پلن به پایین لود می‌شود (نه از سطر به بالا): roll-upهای پلن در حافظه حساب
            // می‌شوند، پس تمام سطرها باید Include شده باشند وگرنه بی‌سروصدا صفر می‌شوند.
            var plan = await _context.SaleInstallmentPlans
                .Include(x => x.Installments)
                .Include(x => x.Sale)
                .Where(x => x.Installments.Any(i => i.Id == request.SaleInstallmentId))
                .FirstOrDefaultAsync(cancellationToken)
                ?? throw new NotFoundCustomException("قسط مورد نظر یافت نشد.");

            if (plan.Status != SaleInstallmentPlanStatusEnum.ACTIVE || !plan.IsActive)
                throw new ValidationCustomException("قرارداد اقساطی جاری نیست و پرداخت روی آن ثبت نمی‌شود.");

            var installment = plan.Installments.First(i => i.Id == request.SaleInstallmentId);

            if (installment.Status == SaleInstallmentStatusEnum.PAID)
                throw new ValidationCustomException("این قسط قبلاً پرداخت شده است.");

            if (installment.Status == SaleInstallmentStatusEnum.CANCELLED)
                throw new ValidationCustomException("این قسط ابطال شده است و پرداخت روی آن ثبت نمی‌شود.");

            var paidAt = request.PaidAt ?? DateTime.Now;
            var now = DateTime.Now;
            var graceDays = await _systemSettingService.GetIntegerAsync(SystemSettingCatalog.InstallmentOverdueGraceDays, cancellationToken);
            var penalty = InstallmentRules.PenaltyDue(plan, installment, paidAt, graceDays);

            var payment = new Domain.Entities.PaymentDetail
            {
                SaleId = plan.SaleId,
                Type = request.PaymentType,
                Purpose = PaymentPurposeEnum.INSTALLMENT,
                Direction = PaymentDirectionEnum.IN,
                Amount = installment.Amount + penalty,
                PaidAt = paidAt,
                CheckNumber = request.CheckNumber,
                CheckDueDate = request.CheckDueDate,
                CheckBankName = request.CheckBankName,
                CheckDrawerName = request.CheckDrawerName,
                TransferRef = request.TransferRef,
                BankAccountId = request.BankAccountId,
            };
            await _paymentAccountResolver.ApplyAsync(new[] { payment }, cancellationToken);
            await _context.PaymentDetails.AddAsync(payment, cancellationToken);
            await PartyLedger.SalePaymentAsync(_context, plan.Sale, payment, cancellationToken);
            await PartyLedger.InstallmentPenaltyAsync(_context, plan.Sale, payment, penalty, paidAt, cancellationToken);

            installment.PenaltyAmount = penalty;
            installment.Status = SaleInstallmentStatusEnum.PAID;
            installment.PaidAt = paidAt;
            installment.PaymentType = request.PaymentType;
            installment.PaymentDetail = payment;
            installment.UpdatedAt = now;

            // اگر دیگر هیچ سطر پرداخت‌نشده‌ای نماند، قرارداد تسویه شده است.
            if (plan.RemainingInstallmentCount == 0)
                plan.Status = SaleInstallmentPlanStatusEnum.SETTLED;

            plan.UpdatedAt = now;
            plan.Sale.PaidAmount = plan.PaidAmount;
            plan.Sale.UpdatedAt = now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await SaleInstallmentPlanReader.ReadAsync(_context, plan.Id, cancellationToken);
            res.Message = "پرداخت قسط با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
