using Common.Exceptions;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;

namespace Application.Common.Payments
{
    /// <summary>One movement of money, as AddXPayment/EditXPayment receive it.</summary>
    public abstract class PaymentInput
    {
        /// <summary>How the money moved: CASH, CREDIT, CHECK or TRANSFER.</summary>
        public PaymentTypeEnum Type { get; set; }
        public UInt64 Amount { get; set; }

        /// <summary>When the money actually moved; now when omitted.</summary>
        public DateTime? PaidAt { get; set; }
        public string? CheckNumber { get; set; }
        public string? TransferRef { get; set; }
    }

    public class PaymentInputValidator : AbstractValidator<PaymentInput>
    {
        public PaymentInputValidator()
        {
            RuleFor(x => x.Amount).GreaterThan(0UL).WithMessage("مبلغ پرداخت باید از صفر بیشتر باشد.");
            RuleFor(x => x.Type).Must(DocumentPayments.IsRowMethod)
                .WithMessage("روش پرداخت باید نقدی، نسیه، چک یا انتقال بانکی باشد.");
        }
    }

    /// <summary>
    /// Writes and voids payment rows. A row is never edited or deleted: voiding stamps VoidedAt, editing is voiding plus
    /// a new row - so the history of what was recorded, and when it was taken back, stays. Only NORMAL rows are handled
    /// here; installment rows belong to the installment commands, which also move the installment's own status.
    /// </summary>
    public static class PaymentWriter
    {
        public static PaymentDetail NewRow(PaymentInput input, PaymentDirectionEnum direction) => new()
        {
            Type = input.Type,
            Purpose = PaymentPurposeEnum.NORMAL,
            Direction = direction,
            Amount = input.Amount,
            PaidAt = input.PaidAt ?? DateTime.Now,
            CheckNumber = input.CheckNumber,
            TransferRef = input.TransferRef,
        };

        public static void Void(PaymentDetail row)
        {
            if (row.VoidedAt != null)
                throw new ValidationCustomException("این پرداخت قبلاً ابطال شده است.");

            if (row.Purpose != PaymentPurposeEnum.NORMAL)
                throw new ValidationCustomException("پرداخت‌های قرارداد اقساطی فقط از مسیر همان قرارداد تغییر می‌کنند.");

            row.VoidedAt = DateTime.Now;
        }
    }
}
