using Application.Common.Dtos;
using FluentValidation;

namespace Application.Common.Payments
{
    /// <summary>One payment row sent with CreateSale/CreatePurchase: a single movement of money.</summary>
    public class PaymentRowValidator : AbstractValidator<PaymentDetailDto>
    {
        public PaymentRowValidator()
        {
            RuleFor(x => x.Amount).GreaterThan(0).WithMessage("مبلغ هر پرداخت باید از صفر بیشتر باشد.");
            RuleFor(x => x.Type).Must(DocumentPayments.IsRowMethod)
                .WithMessage("روش هر پرداخت باید نقدی، نسیه، چک یا انتقال بانکی باشد.");
        }
    }
}
