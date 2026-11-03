using Common.Exceptions;
using Domain.Entities;
using Domain.Enums;
using FluentValidation;

namespace Application.Common.Payments
{
    /// <summary>One movement of money, as AddXPayment/EditXPayment receive it.</summary>
    public abstract class PaymentInput : IPosPaymentFields
    {
        /// <summary>How the money moved: CASH, CHECK or TRANSFER.</summary>
        public PaymentTypeEnum Type { get; set; }
        public UInt64 Amount { get; set; }

        /// <summary>When the money actually moved; now when omitted.</summary>
        public DateTime? PaidAt { get; set; }
        public string? CheckNumber { get; set; }
        public string? TransferRef { get; set; }

        /// <summary>CHECK rows only: the date on the cheque (default: PaidAt), its bank and whose account it is drawn on.</summary>
        public DateTime? CheckDueDate { get; set; }
        public string? CheckBankName { get; set; }
        public string? CheckDrawerName { get; set; }

        /// <summary>
        /// The cash box or bank account the money went through. Optional unless the Payment.RequireBankAccount setting is on;
        /// a card-reader row whose device is linked to an account gets that account when this is left out.
        /// </summary>
        public int? BankAccountId { get; set; }

        /// <summary>Card-reader details, TRANSFER rows only (see IPosPaymentFields).</summary>
        public int? PosTerminalId { get; set; }
        public string? MaskedCardNumber { get; set; }
        public string? ApprovalCode { get; set; }
        public string? TraceNumber { get; set; }
    }

    public class PaymentInputValidator : AbstractValidator<PaymentInput>
    {
        public PaymentInputValidator()
        {
            RuleFor(x => x.Amount).GreaterThan(0UL).WithMessage("مبلغ پرداخت باید از صفر بیشتر باشد.");
            RuleFor(x => x.BankAccountId).GreaterThan(0).When(x => x.BankAccountId.HasValue).WithMessage("صندوق/حساب بانکی نامعتبر است.");
            RuleFor(x => x.Type).Must(DocumentPayments.IsRowMethod)
                .WithMessage("روش پرداخت باید نقدی، چک یا انتقال بانکی باشد؛ نسیه پرداخت نیست.");
            Include(new PosPaymentFieldsValidator());
            RuleFor(x => x).Must(x => x.CheckDueDate == null && x.CheckBankName == null && x.CheckDrawerName == null)
                .When(x => x.Type != PaymentTypeEnum.CHECK)
                .WithMessage("سررسید، بانک و صاحب حساب فقط برای پرداخت چکی ثبت می‌شود.");
            RuleFor(x => x.CheckBankName).MaximumLength(100).WithMessage("نام بانک چک حداکثر ۱۰۰ نویسه است.");
            RuleFor(x => x.CheckDrawerName).MaximumLength(100).WithMessage("نام صاحب حساب چک حداکثر ۱۰۰ نویسه است.");
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
            TransferRef = input.TransferRef?.Trim(),
            CheckDueDate = input.CheckDueDate?.Date,
            CheckBankName = string.IsNullOrWhiteSpace(input.CheckBankName) ? null : input.CheckBankName.Trim(),
            CheckDrawerName = string.IsNullOrWhiteSpace(input.CheckDrawerName) ? null : input.CheckDrawerName.Trim(),
            BankAccountId = input.BankAccountId,
            PosTerminalId = input.PosTerminalId,
            Source = SourceOf(input),
            MaskedCardNumber = input.MaskedCardNumber,
            ApprovalCode = input.ApprovalCode,
            TraceNumber = input.TraceNumber,
        };

        /// <summary>
        /// Every card-reader row is a manual one until signed device results exist (frontend-requests 12.1);
        /// then a verified signature will make it DEVICE. Null for every other payment.
        /// </summary>
        public static PaymentSourceEnum? SourceOf(IPosPaymentFields row)
            => row.PosTerminalId.HasValue ? PaymentSourceEnum.MANUAL_RECEIPT : null;

        /// <summary>
        /// A card payment is a fact on the bank's side: it is voided, never edited. Editing is void + new row, and
        /// the new row would carry the same RRN, which stays taken by the voided one (12.2).
        /// </summary>
        public static void EnsureEditable(PaymentDetail row)
        {
            if (row.PosTerminalId.HasValue)
                throw new ValidationCustomException("پرداخت کارتخوان ویرایش نمی‌شود؛ اگر اشتباه ثبت شده، آن را ابطال کنید.");
            EnsureChequeOpen(row);
        }

        /// <summary>
        /// A cheque that was cashed, bounced or passed on is a fact on the bank's side: it is no longer edited or voided.
        /// Bouncing is its own command (Check/BounceCheck).
        /// </summary>
        public static void EnsureChequeOpen(PaymentDetail row)
        {
            if (row.CheckStatus is PaymentCheckStatusEnum.CASHED or PaymentCheckStatusEnum.BOUNCED or PaymentCheckStatusEnum.ENDORSED)
                throw new ValidationCustomException("سرنوشت این چک (وصول، برگشت یا خرج) ثبت شده است؛ پرداخت آن دیگر ویرایش یا ابطال نمی‌شود.");
        }

        public static void Void(PaymentDetail row)
        {
            if (row.VoidedAt != null)
                throw new ValidationCustomException("این پرداخت قبلاً ابطال شده است.");
            EnsureChequeOpen(row);

            if (row.Purpose != PaymentPurposeEnum.NORMAL)
                throw new ValidationCustomException("پرداخت‌های قرارداد اقساطی فقط از مسیر همان قرارداد تغییر می‌کنند.");

            row.VoidedAt = DateTime.Now;
        }
    }
}
