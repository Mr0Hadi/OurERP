using Application.Common.Contracts.Context;
using Application.Common.Documents;
using Application.Common.Dtos;
using Application.Common.Enums;
using Application.Common.Sales;
using Application.Features.Sale.Dtos;
using Application.Features.SaleInstallment.Dtos;
using Common.Exceptions;
using Common.Extensions;
using Domain.Enums;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Application.Features.SaleInstallment.Queries
{
    /// <summary>
    /// The contract CreateSaleInstallmentPlan would write, computed and not saved, so the customer sees the charge, the
    /// payable amount, each installment and its due date before signing (frontend-requests 17.2). The principal is the
    /// sale's own invoice total (<see cref="SaleId"/>) or, before the sale exists, the total of <see cref="Items"/> stamped
    /// with each product's tax exactly as CreateSale stamps them. Same InstallmentSchedule as the real plan, so the two
    /// cannot disagree.
    /// </summary>
    public class PreviewSaleInstallmentPlanQuery : IRequest<ResponseDto>
    {
        public int? SaleId { get; set; }
        public List<CreateSaleItemDto>? Items { get; set; }

        public decimal MarkupPercentage { get; set; }
        public UInt64 DownPaymentAmount { get; set; }
        public int InstallmentCount { get; set; }
        public DateTime FirstDueDate { get; set; }
        public decimal? LatePenaltyPercentage { get; set; }
    }

    public class PreviewSaleInstallmentPlanQueryValidator : AbstractValidator<PreviewSaleInstallmentPlanQuery>
    {
        public PreviewSaleInstallmentPlanQueryValidator()
        {
            RuleFor(x => x).Must(x => x.SaleId.HasValue != (x.Items is { Count: > 0 }))
                .WithMessage("یکی از فروش یا اقلام فاکتور باید فرستاده شود.");
            RuleForEach(x => x.Items).ChildRules(item =>
            {
                item.RuleFor(i => i.ProductId).GreaterThan(0).WithMessage(Validation.RequiredMessage("محصول"));
                item.RuleFor(i => i.Quantity).GreaterThan(0).WithMessage("تعداد هر قلم باید از صفر بیشتر باشد.");
                item.RuleFor(i => i.Discount).InclusiveBetween(0, 100).WithMessage("تخفیف باید بین ۰ تا ۱۰۰ درصد باشد.");
            });
            RuleFor(x => x.MarkupPercentage).GreaterThanOrEqualTo(0).WithMessage("درصد افزایش نمی‌تواند منفی باشد.");
            RuleFor(x => x.InstallmentCount).GreaterThan(0).WithMessage("تعداد اقساط باید از صفر بیشتر باشد.");
            RuleFor(x => x.FirstDueDate).Must(d => d != default).WithMessage(Validation.RequiredMessage("سررسید اولین قسط"));
        }
    }

    public class PreviewSaleInstallmentPlanQueryHandler : IRequestHandler<PreviewSaleInstallmentPlanQuery, ResponseDto>
    {
        private readonly IWMSDbContext _context;

        public PreviewSaleInstallmentPlanQueryHandler(IWMSDbContext context)
        {
            _context = context;
        }

        public async Task<ResponseDto> Handle(PreviewSaleInstallmentPlanQuery request, CancellationToken cancellationToken)
        {
            var res = new ResponseDto();

            UInt64 cashAmount;
            if (request.SaleId is int saleId)
            {
                cashAmount = await _context.Sales.Where(x => x.Id == saleId && x.IsActive).Select(x => (UInt64?)x.TotalAmount).FirstOrDefaultAsync(cancellationToken)
                    ?? throw new NotFoundCustomException("فروش مورد نظر یافت نشد.");
            }
            else
            {
                var products = await DocumentProducts.LoadAsync(_context, request.Items!.Select(i => i.ProductId), cancellationToken);
                var lines = request.Items!.Select(i =>
                {
                    var line = new Domain.Entities.SaleItem { ProductId = i.ProductId, Quantity = i.Quantity, UnitPrice = i.UnitPrice, Discount = i.Discount };
                    InvoiceLineMath.Stamp(line, products[i.ProductId]);
                    return line;
                }).ToList();
                cashAmount = InvoiceLineMath.DocumentTotal(lines);
            }

            var chargeAmount = InstallmentSchedule.ChargeAmount(cashAmount, request.MarkupPercentage);
            var totalAmount = checked(cashAmount + chargeAmount);
            if (request.DownPaymentAmount >= totalAmount)
                throw new ValidationCustomException("پیش‌پرداخت باید از مبلغ قابل پرداخت قرارداد کمتر باشد.");

            var financedAmount = totalAmount - request.DownPaymentAmount;
            var installments = InstallmentSchedule.Build(financedAmount, request.InstallmentCount, request.FirstDueDate);

            res.Data = new SaleInstallmentPlanDto
            {
                SaleId = request.SaleId ?? 0,
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
                StatusTitle = SaleInstallmentPlanStatusEnum.ACTIVE.GetDescription(),
                RemainingInstallmentCount = request.InstallmentCount,
                PaidAmount = request.DownPaymentAmount,
                RemainingAmount = financedAmount,
                NextDueDate = request.FirstDueDate,
                Installments = installments.Select(i => new SaleInstallmentDto
                {
                    Number = i.Number,
                    DueDate = i.DueDate,
                    Amount = i.Amount,
                    Status = i.Status,
                    StatusTitle = i.Status.GetDescription(),
                }).ToList(),
            };
            res.Message = "پیش‌نمایش قرارداد اقساطی آماده شد.";
            res.ResponseMessageType = ResponseMessageTypeEnum.Success.ToString();
            return res;
        }
    }
}
