using Application.Common.Contracts.Context;
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
    /// ویرایش قرارداد اقساطی - مجاز است حتی بعد از شروع پرداخت، ولی فقط روی بخش پرداخت‌نشده:
    /// سطرهای PAID هرگز تغییر نمی‌کنند و حذف نمی‌شوند، و PaymentDetailهای ثبت‌شده دست‌نخورده
    /// می‌مانند. سطرهای پرداخت‌نشده حذف و با زمان‌بندی جدید بازتولید می‌شوند، با ادامه‌ی
    /// شماره‌گذاری از آخرین سطر PAID؛ مبلغ باقیمانده (TotalAmount - PaidAmount) فقط روی همین
    /// سطرهای جدید پخش می‌شود و باقیمانده‌ی رُند باز هم روی آخرین سطر می‌نشیند.
    /// </summary>
    public class UpdateSaleInstallmentPlanCommand : IRequest<ResponseDto>
    {
        public int Id { get; set; }
        public UInt64 CashAmount { get; set; }
        public decimal MarkupPercentage { get; set; }
        public UInt64 TotalAmount { get; set; }
        public int InstallmentCount { get; set; }
        public DateTime FirstDueDate { get; set; }
        public decimal? LatePenaltyPercentage { get; set; }
    }

    public class UpdateSaleInstallmentPlanCommandValidator : AbstractValidator<UpdateSaleInstallmentPlanCommand>
    {
        public UpdateSaleInstallmentPlanCommandValidator()
        {
            RuleFor(x => x.Id).GreaterThan(0).WithMessage(Validation.RequiredMessage("قرارداد اقساطی"));
            RuleFor(x => x.CashAmount).Must(x => x > 0).WithMessage("قیمت نقدی باید از صفر بیشتر باشد.");
            RuleFor(x => x.MarkupPercentage).GreaterThanOrEqualTo(0).WithMessage("درصد افزایش نمی‌تواند منفی باشد.");
            RuleFor(x => x.TotalAmount).Must(x => x > 0).WithMessage("مبلغ کل باید از صفر بیشتر باشد.");
            RuleFor(x => x.InstallmentCount).GreaterThan(0).WithMessage("تعداد اقساط باید از صفر بیشتر باشد.");
            RuleFor(x => x.FirstDueDate).Must(d => d != default).WithMessage(Validation.RequiredMessage("سررسید اولین قسط"));
            RuleFor(x => x.LatePenaltyPercentage).GreaterThanOrEqualTo(0)
                .When(x => x.LatePenaltyPercentage.HasValue)
                .WithMessage("درصد جریمه‌ی دیرکرد نمی‌تواند منفی باشد.");
        }
    }

    public class UpdateSaleInstallmentPlanCommandHandler : IRequestHandler<UpdateSaleInstallmentPlanCommand, ResponseDto>
    {
        private readonly IWMSDbContext _context;
        private readonly IUnitOfWork _unitOfWork;

        public UpdateSaleInstallmentPlanCommandHandler(IWMSDbContext context, IUnitOfWork unitOfWork)
        {
            _context = context;
            _unitOfWork = unitOfWork;
        }

        public async Task<ResponseDto> Handle(UpdateSaleInstallmentPlanCommand request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            var plan = await _context.SaleInstallmentPlans
                .Include(x => x.Installments)
                .Include(x => x.Sale)
                .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken)
                ?? throw new NotFoundCustomException("قرارداد اقساطی مورد نظر یافت نشد.");

            if (plan.Status != SaleInstallmentPlanStatusEnum.ACTIVE || !plan.IsActive)
                throw new ValidationCustomException("فقط قرارداد اقساطی جاری قابل ویرایش است.");

            var paidInstallments = plan.Installments.Where(i => i.Status == SaleInstallmentStatusEnum.PAID).ToList();

            if (request.InstallmentCount < paidInstallments.Count)
                throw new ValidationCustomException("تعداد اقساط نمی‌تواند از تعداد اقساط پرداخت‌شده کمتر باشد.");

            var paidAmount = plan.PaidAmount;
            if (request.TotalAmount < paidAmount)
                throw new ValidationCustomException("مبلغ کل نمی‌تواند از مبلغ پرداخت‌شده کمتر باشد.");

            var expectedTotal = InstallmentSchedule.ExpectedTotalAmount(request.CashAmount, request.MarkupPercentage);
            var difference = expectedTotal > request.TotalAmount ? expectedTotal - request.TotalAmount : request.TotalAmount - expectedTotal;
            if (difference > 1UL)
                throw new ValidationCustomException("مبلغ کل با قیمت نقدی و درصد افزایش هم‌خوانی ندارد.");

            var newRowCount = request.InstallmentCount - paidInstallments.Count;
            var remainingToSchedule = request.TotalAmount - paidAmount;

            if (newRowCount == 0 && remainingToSchedule > 0UL)
                throw new ValidationCustomException("برای مبلغ باقیمانده باید حداقل یک قسط پرداخت‌نشده وجود داشته باشد.");

            var now = DateTime.Now;

            // سطرهای پرداخت‌نشده اول حذف و ذخیره می‌شوند و بعد سطرهای جدید اضافه می‌شوند:
            // شماره‌های جدید می‌توانند با شماره‌های حذف‌شده هم‌پوشانی داشته باشند و EF ترتیب
            // delete-قبل-از-insert را در یک batch تضمین نمی‌کند - یعنی unique index روی
            // (SaleInstallmentPlanId, Number) می‌شکست.
            var unpaid = plan.Installments
                .Where(i => i.Status != SaleInstallmentStatusEnum.PAID)
                .ToList();

            if (unpaid.Count > 0)
            {
                _context.SaleInstallments.RemoveRange(unpaid);
                foreach (var installment in unpaid)
                    plan.Installments.Remove(installment);

                await _unitOfWork.SaveChangesAsync(cancellationToken);
            }

            var startNumber = paidInstallments.Count == 0 ? 1 : paidInstallments.Max(i => i.Number) + 1;
            foreach (var installment in InstallmentSchedule.Build(remainingToSchedule, newRowCount, request.FirstDueDate, startNumber))
                plan.Installments.Add(installment);

            plan.CashAmount = request.CashAmount;
            plan.MarkupPercentage = request.MarkupPercentage;
            plan.TotalAmount = request.TotalAmount;
            // پیش‌پرداخت پس از ثبت قابل تغییر نیست - پرداختش انجام شده.
            plan.FinancedAmount = request.TotalAmount - plan.DownPaymentAmount;
            plan.InstallmentCount = request.InstallmentCount;
            plan.InstallmentAmount = InstallmentSchedule.BaseInstallmentAmount(remainingToSchedule, newRowCount);
            plan.FirstDueDate = request.FirstDueDate;
            plan.LatePenaltyPercentage = request.LatePenaltyPercentage;
            plan.UpdatedAt = now;

            // اگر مبلغ کل عوض شد، فروش هم باید با آن هماهنگ شود.
            plan.Sale.TotalAmount = request.TotalAmount;
            plan.Sale.PaidAmount = paidAmount;
            plan.Sale.UpdatedAt = now;

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            res.Data = await SaleInstallmentPlanReader.ReadAsync(_context, plan.Id, cancellationToken);
            res.Message = "قرارداد اقساطی با موفقیت بروزرسانی شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
