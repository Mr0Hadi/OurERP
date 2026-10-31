using Application.Common.Contracts.Context;
using Application.Common.Settings;
using Common.Exceptions;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Application.Common.Returns
{
    /// <summary>
    /// The cash box / bank account rule for return money, the return-side counterpart of IPaymentAccountResolver (both return
    /// sides, AddClaimResolution and ExecuteMoneyEffect). Only CASH and TRANSFER money goes through an account: ON_ACCOUNT moves
    /// no money and a cheque on a return has no lifecycle that would say when it clears, so neither may name one. A named
    /// account must be active, and while Payment.RequireBankAccount is on, applied cash/transfer money must name one - pending
    /// money is checked when it is executed. Read-only; nothing is staged.
    /// </summary>
    public static class ReturnMoneyAccounts
    {
        /// <param name="Applied">The money has moved (APPLIED); pending promises are not held to the required-account setting yet.</param>
        public record Piece(ReturnPaymentMethodEnum? Method, int? BankAccountId, bool Applied);

        public static bool TakesAccount(ReturnPaymentMethodEnum? method) =>
            method is ReturnPaymentMethodEnum.CASH or ReturnPaymentMethodEnum.TRANSFER;

        public static async Task EnsureAsync(IWMSDbContext context, IReadOnlyCollection<Piece> pieces, CancellationToken cancellationToken)
        {
            if (pieces.Count == 0)
                return;

            if (pieces.Any(p => p.BankAccountId != null && !TakesAccount(p.Method)))
                throw new ValidationCustomException("صندوق/حساب بانکی فقط برای پول نقد یا انتقال بانکی انتخاب می‌شود؛ در پرداخت ترکیبی روی هر بخش.");

            var accountIds = pieces.Where(p => p.BankAccountId != null).Select(p => p.BankAccountId!.Value).Distinct().ToList();
            if (accountIds.Count > 0)
            {
                var active = await context.BankAccounts.CountAsync(x => accountIds.Contains(x.Id) && x.IsActive, cancellationToken);
                if (active != accountIds.Count)
                    throw new ValidationCustomException("صندوق/حساب بانکی انتخاب‌شده یافت نشد یا غیرفعال است.");
            }

            if (pieces.Any(p => p.Applied && p.BankAccountId == null && TakesAccount(p.Method))
                && await SystemSettingValues.GetBooleanAsync(context, SystemSettingCatalog.PaymentRequireBankAccount, cancellationToken))
                throw new ValidationCustomException("صندوق یا حساب بانکی‌ای را که پول مرجوعی از آن دریافت یا پرداخت شده انتخاب کنید.");
        }

        /// <summary>The pieces of one money effect: the effect itself, or its parts when it is MIXED.</summary>
        public static IEnumerable<Piece> Of(ReturnPaymentMethodEnum? method, int? bankAccountId, bool applied, IEnumerable<(ReturnPaymentMethodEnum Method, int? BankAccountId)> parts)
        {
            if (method != ReturnPaymentMethodEnum.MIXED)
                return new[] { new Piece(method, bankAccountId, applied) };

            // The effect line of a MIXED effect carries no account itself (MIXED is not CASH/TRANSFER, so one sent is refused).
            return parts.Select(p => new Piece(p.Method, p.BankAccountId, applied)).Prepend(new Piece(method, bankAccountId, applied));
        }
    }
}
