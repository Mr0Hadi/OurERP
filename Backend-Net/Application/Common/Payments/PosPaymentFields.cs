using Domain.Enums;
using FluentValidation;

namespace Application.Common.Payments
{
    /// <summary>
    /// The card-reader details a TRANSFER row may carry, so a payment can be matched against the bank's
    /// statement later. All optional; shared by the payment input of AddXPayment/EditXPayment and the
    /// paymentDetails rows of CreateSale/CreatePurchase.
    /// </summary>
    public interface IPosPaymentFields
    {
        PaymentTypeEnum Type { get; }

        /// <summary>The RRN on a card-reader row.</summary>
        string? TransferRef { get; }
        int? PosTerminalId { get; }

        /// <summary>Masked card number as the device prints it, e.g. 603770******1234 - never the full number.</summary>
        string? MaskedCardNumber { get; }
        string? ApprovalCode { get; }
        string? TraceNumber { get; }
    }

    public class PosPaymentFieldsValidator : AbstractValidator<IPosPaymentFields>
    {
        public const int MaxLength = 32;

        /// <summary>Indexable, and long enough for any RRN or tracking number (frontend-requests 11.2 asked for at least 64).</summary>
        public const int MaxTransferRefLength = 64;

        // A masked number keeps at most the first six and last four digits. More than ten means the
        // full card number was sent, and storing that is exactly what card-data rules forbid.
        private const int MaxVisibleCardDigits = 10;

        public PosPaymentFieldsValidator()
        {
            RuleFor(x => x)
                .Must(x => x.PosTerminalId == null && x.MaskedCardNumber == null && x.ApprovalCode == null && x.TraceNumber == null)
                .When(x => x.Type != PaymentTypeEnum.TRANSFER)
                .WithMessage("اطلاعات کارتخوان فقط برای پرداخت «انتقال بانکی» ثبت می‌شود.");

            RuleFor(x => x.PosTerminalId).GreaterThan(0).When(x => x.PosTerminalId.HasValue)
                .WithMessage("دستگاه کارتخوان نامعتبر است.");

            RuleFor(x => x.TransferRef).MaximumLength(MaxTransferRefLength)
                .WithMessage($"شماره‌ی پیگیری/مرجع حداکثر {MaxTransferRefLength} نویسه است.");

            // The RRN is what makes a card payment unique on its device (12.2), so it cannot be left out.
            RuleFor(x => x.TransferRef).Must(x => !string.IsNullOrWhiteSpace(x)).When(x => x.PosTerminalId.HasValue)
                .WithMessage("شماره‌ی مرجع (RRN) پرداخت کارتخوان الزامی است.");

            RuleFor(x => x.MaskedCardNumber)
                .MaximumLength(MaxLength).WithMessage("شماره‌ی کارت بیش از حد طولانی است.")
                .Must(x => x!.Count(char.IsDigit) <= MaxVisibleCardDigits)
                .When(x => !string.IsNullOrEmpty(x.MaskedCardNumber))
                .WithMessage("شماره‌ی کارت باید ماسک‌شده باشد (حداکثر ۶ رقم اول و ۴ رقم آخر)؛ شماره‌ی کامل کارت ذخیره نمی‌شود.");

            RuleFor(x => x.ApprovalCode).MaximumLength(MaxLength).WithMessage("کد تأیید بیش از حد طولانی است.");
            RuleFor(x => x.TraceNumber).MaximumLength(MaxLength).WithMessage("شماره‌ی پیگیری بیش از حد طولانی است.");
        }
    }
}
