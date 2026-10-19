using Application.Common.Contracts.Context;
using Application.Common.Ledger;
using Domain.Entities;
using Domain.Enums;

namespace Application.Common.Installments
{
    /// <summary>
    /// A sale-return money effect applied, or taken back: the party-ledger row (PartyLedger.SaleReturnMoneyAsync) and, for a
    /// refund left on account on an installment sale, the plan shortened by it (InstallmentReturnCredit). The single entry
    /// point the sale-return commands use, so the two can never drift apart.
    /// </summary>
    public static class SaleReturnMoney
    {
        public static async Task RecordAsync(IWMSDbContext context, Sale sale, string returnNumber, int claimId, SaleReturnEffect effect, bool reversal, DateTime occurredAt, CancellationToken cancellationToken)
        {
            await PartyLedger.SaleReturnMoneyAsync(context, sale, returnNumber, claimId, effect, reversal, occurredAt, cancellationToken);

            if (effect.Direction != ReturnEffectDirectionEnum.MONEY_OUT)
                return;

            var onAccount = PartyLedger.OnAccountAmount(effect.Method, effect.Amount ?? 0, effect.MoneyParts.Select(p => (p.Method, p.Amount)));
            if (reversal)
                await InstallmentReturnCredit.ReverseAsync(context, sale, claimId, onAccount, cancellationToken);
            else
                await InstallmentReturnCredit.ApplyAsync(context, sale, claimId, onAccount, cancellationToken);
        }
    }
}
