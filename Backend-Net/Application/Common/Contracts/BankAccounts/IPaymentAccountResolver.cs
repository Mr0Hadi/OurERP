using Domain.Entities;

namespace Application.Common.Contracts.BankAccounts
{
    /// <summary>
    /// Settles which cash box or bank account each new payment row went through, before it is staged. Every command that
    /// writes a PaymentDetail calls it, so the rule is the same on every receipt and payment.
    /// </summary>
    public interface IPaymentAccountResolver
    {
        /// <summary>
        /// For each row: a named account must exist and be active; a card-reader row with no account takes its device's
        /// (PosTerminal.BankAccountId); and when the Payment.RequireBankAccount setting is on, a row still without one is
        /// refused (CREDIT rows excepted - no money moves). Sets PaymentDetail.BankAccountId in place.
        /// </summary>
        Task ApplyAsync(IEnumerable<PaymentDetail> rows, CancellationToken cancellationToken);
    }
}
