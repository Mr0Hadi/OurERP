using Application.Common.Ledger;
using Application.Common.Contracts.Context;
using Application.Common.Contracts.Repositories;
using Application.Common.Contracts.UnitOfWork;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Sales;
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
    /// قرارداد اقساطی یک فروش را می‌سازد، تمام سطرهای قسط را تولید می‌کند و پیش‌پرداخت را
    /// به‌عنوان یک PaymentDetail واقعی ثبت می‌کند. اگر فروش در پیش‌فاکتور باشد، همین‌جا -
    /// نه در CreateSale - نهایی می‌شود: در فروش اقساطی شرطِ خروج «پرداخت کامل» نیست، بلکه
    /// «وجود پلن فعال به‌همراه پیش‌پرداخت ثبت‌شده» است.
    /// قیمت نقدی = جمع فاکتور فروش، سود اقساط = round(قیمت نقدی × درصد)، مبلغ قابل پرداخت = جمع این دو؛ هر سه را سرور
    /// می‌نشاند و فاکتور فروش (Sale.TotalAmount) دست نمی‌خورد.
    /// </summary>
    public class CreateSaleInstallmentPlanCommand : IRequest<ResponseDto>
    {
        public int SaleId { get; set; }
        public decimal MarkupPercentage { get; set; }
        public UInt64 DownPaymentAmount { get; set; }
        public int InstallmentCount { get; set; }
        public DateTime FirstDueDate { get; set; }
        public decimal? LatePenaltyPercentage { get; set; }

        // اطلاعات پرداخت پیش‌پرداخت
        public PaymentTypeEnum PaymentType { get; set; }
        public string? CheckNumber { get; set; }
        public string? TransferRef { get; set; }
        public DateTime? PaidAt { get; set; }
    }

    public class CreateSaleInstallmentPlanCommandValidator : AbstractValidator<CreateSaleInstallmentPlanCommand>
    {
        public CreateSaleInstallmentPlanCommandValidator()
        {
            RuleFor(x => x.SaleId).GreaterThan(0).WithMessage(Validation.RequiredMessage("فروش"));
            RuleFor(x => x.MarkupPercentage).GreaterThanOrEqualTo(0).WithMessage("درصد افزایش نمی‌تواند منفی باشد.");
            // تعداد اقساط سمت سرور به مجموعه‌ی خاصی محدود نیست - فرانت چند گزینه‌ی از پیش
            // تعیین‌شده نشان می‌دهد. اگر روزی خواستیم این محدودیت را سمت سرور هم اعمال کنیم،
            // جایش دقیقاً همین‌جاست.
            RuleFor(x => x.InstallmentCount).GreaterThan(0).WithMessage("تعداد اقساط باید از صفر بیشتر باشد.");
            RuleFor(x => x.FirstDueDate).Must(d => d != default).WithMessage(Validation.RequiredMessage("سررسید اولین قسط"));
            RuleFor(x => x.LatePenaltyPercentage).GreaterThanOrEqualTo(0)
                .When(x => x.LatePenaltyPercentage.HasValue)
                .WithMessage("درصد جریمه‌ی دیرکرد نمی‌تواند منفی باشد.");
        }
    }

    public class CreateSaleInstallmentPlanCommandHandler : IRequestHandler<CreateSaleInstallmentPlanCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly ISaleInstallmentPlanRepository _planRepository;
        private readonly IUnitOfWork _unitOfWork;

        public CreateSaleInstallmentPlanCommandHandler(IWMSDbContext context, ISaleInstallmentPlanRepository planRepository, IUnitOfWork unitOfWork)
        {
            _context = context;
            _planRepository = planRepository;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(CreateSaleInstallmentPlanCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var sale = await _context.Sales.FirstOrDefaultAsync(x => x.Id == request.SaleId && x.IsActive, cancellationToken)
                ?? throw new NotFoundCustomException("فروش مورد نظر یافت نشد.");

            if (sale.PaymentType != PaymentTypeEnum.INSTALLMENT)
                throw new ValidationCustomException("روش پرداخت این فروش اقساطی نیست.");

            var existingPlan = await _planRepository.GetActiveBySaleIdAsync(sale.Id, cancellationToken);
            if (existingPlan != null)
                throw new ValidationCustomException("برای این فروش قرارداد اقساطی فعالی ثبت شده است.");

            var cashAmount = sale.TotalAmount;
            var chargeAmount = InstallmentSchedule.ChargeAmount(cashAmount, request.MarkupPercentage);
            var totalAmount = checked(cashAmount + chargeAmount);

            if (request.DownPaymentAmount >= totalAmount)
                throw new ValidationCustomException("پیش‌پرداخت باید از مبلغ قابل پرداخت قرارداد کمتر باشد.");

            var paidAt = request.PaidAt ?? DateTime.Now;
            if (request.FirstDueDate.Date < paidAt.Date)
                throw new ValidationCustomException("سررسید اولین قسط نمی‌تواند قبل از تاریخ پیش‌پرداخت باشد.");

            var now = DateTime.Now;
            var financedAmount = totalAmount - request.DownPaymentAmount;

            var plan = new Domain.Entities.SaleInstallmentPlan
            {
                SaleId = sale.Id,
                CashAmount = cashAmount,
                MarkupPercentage = request.MarkupPercentage,
                InstallmentChargeAmount = chargeAmount,
                TotalAmount = totalAmount,
                DownPaymentAmount = request.DownPaymentAmount,
                FinancedAmount = financedAmount,
                InstallmentCount = request.InstallmentCount,
                InstallmentAmount = InstallmentSchedule.BaseInstallmentAmount(financedAmount, request.InstallmentCount),
                FirstDueDate = request.FirstDueDate,
                LatePenaltyPercentage = request.LatePenaltyPercentage,
                Status = SaleInstallmentPlanStatusEnum.ACTIVE,
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now,
                Installments = InstallmentSchedule.Build(financedAmount, request.InstallmentCount, request.FirstDueDate),
            };

            await _planRepository.AddAsync(plan, cancellationToken);

            var downPayment = new Domain.Entities.PaymentDetail
            {
                SaleId = sale.Id,
                Type = request.PaymentType,
                Purpose = PaymentPurposeEnum.INSTALLMENT_DOWN_PAYMENT,
                Direction = PaymentDirectionEnum.IN,
                Amount = request.DownPaymentAmount,
                PaidAt = paidAt,
                CheckNumber = request.CheckNumber,
                TransferRef = request.TransferRef,
            };
            await _context.PaymentDetails.AddAsync(downPayment, cancellationToken);
            await PartyLedger.SalePaymentAsync(_context, sale, downPayment, cancellationToken);

            // تنها عددی که در دو جا نگه داشته می‌شود: همیشه برابر plan.PaidAmount.
            sale.PaidAmount = plan.PaidAmount;
            sale.UpdatedAt = now;

            // نهایی‌سازی خروج از پیش‌فاکتور: در فروش اقساطی، وجود پلن فعال + ثبت پیش‌پرداخت
            // جای شرط «پرداخت کامل» را می‌گیرد.
            if (sale.Status == SalesStatusEnum.PROFORMA && plan.DownPaymentAmount > 0)
                await SaleInvoiceFinalizer.FinalizeAsync(_context, sale, cancellationToken);

            // The charge goes on the customer's account together with the invoice; a proforma has neither yet.
            await PartyLedger.InstallmentChargeChangedAsync(_context, sale, plan.InstallmentChargeAmount, paidAt, cancellationToken);

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await SaleInstallmentPlanReader.ReadAsync(_context, plan.Id, cancellationToken);
            res.Message = "قرارداد اقساطی با موفقیت ثبت شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
