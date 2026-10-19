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
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Application.Common.Audit;

namespace Application.Features.SaleInstallment.Commands
{
    /// <summary>
    /// تسویه‌ی کامل زودهنگام: تمام سطرهای پرداخت‌نشده با یک PaymentDetail یکجا پرداخت‌شده
    /// علامت می‌خورند.
    ///
    /// Rows not yet due are discounted by their share of the installment charge times the
    /// Installment.EarlySettlementDiscountPercentage setting (default 100): the charge, total and those rows' Amount drop by it,
    /// and the customer's account gets the lower charge (PartyLedger.InstallmentChargeChangedAsync). Late rows pay their penalty
    /// in the same payment, exactly like PaySaleInstallment.
    /// </summary>
    [AuditAction(AuditActionEnum.SettleSaleInstallmentPlan)]
    public class SettleSaleInstallmentPlanCommand : IRequest<ResponseDto>
    {
        public int? SaleId { get; set; }
        public int? PlanId { get; set; }
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
        private readonly IPaymentAccountResolver _paymentAccountResolver;
        private readonly ISystemSettingService _systemSettingService;

        public SettleSaleInstallmentPlanCommandHandler(IWMSDbContext context, IUnitOfWork unitOfWork, IPaymentAccountResolver paymentAccountResolver, ISystemSettingService systemSettingService)
        {
            _context = context;
            _unitOfWork = unitOfWork;
            _paymentAccountResolver = paymentAccountResolver;
            _systemSettingService = systemSettingService;
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
            var graceDays = await _systemSettingService.GetIntegerAsync(SystemSettingCatalog.InstallmentOverdueGraceDays, cancellationToken);
            var discountPercentage = await _systemSettingService.GetIntegerAsync(SystemSettingCatalog.InstallmentEarlySettlementDiscountPercentage, cancellationToken);

            // Late rows pay their penalty; rows not yet due are discounted by their share of the installment charge. Shares
            // are taken before any row changes, from the plan as it stood.
            var penalties = unpaid.ToDictionary(i => i.Id, i => InstallmentRules.PenaltyDue(plan, i, paidAt, graceDays));
            var discounts = unpaid.ToDictionary(i => i.Id, i => InstallmentRules.IsNotYetDue(i, paidAt)
                ? (ulong)Math.Round((decimal)InstallmentRules.ChargeShare(plan, i) * discountPercentage / 100m, MidpointRounding.AwayFromZero)
                : 0UL);
            var totalDiscount = Math.Min(discounts.Values.Aggregate(0UL, (sum, d) => sum + d), plan.InstallmentChargeAmount);
            var totalPenalty = penalties.Values.Aggregate(0UL, (sum, p) => sum + p);

            if (totalDiscount > 0)
            {
                var left = totalDiscount;
                foreach (var installment in unpaid)
                {
                    var take = Math.Min(Math.Min(discounts[installment.Id], left), installment.Amount);
                    installment.Amount -= take;
                    installment.EarlySettlementDiscountAmount += take;
                    left -= take;
                }

                plan.InstallmentChargeAmount -= totalDiscount;
                plan.TotalAmount -= totalDiscount;
                plan.FinancedAmount -= totalDiscount;
                plan.EarlySettlementDiscountAmount += totalDiscount;
                await PartyLedger.InstallmentChargeChangedAsync(_context, plan.Sale, plan.InstallmentChargeAmount, paidAt, cancellationToken);
            }

            var payment = new Domain.Entities.PaymentDetail
            {
                SaleId = plan.SaleId,
                Type = request.PaymentType,
                Purpose = PaymentPurposeEnum.INSTALLMENT,
                Direction = PaymentDirectionEnum.IN,
                // The remaining after the early-settlement discount, plus the late rows' penalties.
                Amount = plan.RemainingAmount + totalPenalty,
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
            await PartyLedger.InstallmentPenaltyAsync(_context, plan.Sale, payment, totalPenalty, paidAt, cancellationToken);

            foreach (var installment in unpaid)
            {
                installment.PenaltyAmount = penalties[installment.Id];
                installment.Status = SaleInstallmentStatusEnum.PAID;
                installment.PaidAt = paidAt;
                installment.PaymentType = request.PaymentType;
                installment.PaymentDetail = payment;
                installment.UpdatedAt = now;
            }

            plan.Status = SaleInstallmentPlanStatusEnum.SETTLED;
            plan.UpdatedAt = now;
            plan.Sale.PaidAmount = plan.PaidAmount;
            plan.Sale.UpdatedAt = now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await SaleInstallmentPlanReader.ReadAsync(_context, plan.Id, cancellationToken);
            res.Message = "تسویه‌ی کامل قرارداد اقساطی با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
