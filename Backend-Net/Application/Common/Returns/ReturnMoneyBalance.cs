using Application.Common.Dtos.Returns;
using Common.Exceptions;
using Domain.Enums;

namespace Application.Common.Returns
{
    /// <summary>
    /// The money-balance rule for one resolution, shared verbatim by PurchaseReturn and SaleReturn.
    /// Pure: it reads the composition and nothing else - not the claim, its scope or its problem.
    ///
    /// balance = Σ GoodsIn quantity × unitPrice − Σ GoodsOut quantity × unitPrice, in rial, where every
    /// unitPrice is the one the client sent on that goods effect (zero is a legal price).
    /// <list type="bullet">
    /// <item>balance &gt; 0: we owe them - the resolution must carry a MONEY_OUT of at least that amount.</item>
    /// <item>balance &lt; 0: they owe us - it must carry a MONEY_IN of at least that amount.</item>
    /// <item>balance == 0: nothing is required and nothing is forbidden.</item>
    /// </list>
    /// <b>A floor, not a reconciliation.</b> Money beyond the required amount, and money in the other
    /// direction, is always accepted.
    /// </summary>
    public static class ReturnMoneyBalance
    {
        /// <summary>Int128 so quantity × price can never overflow. Every goods effect must carry a UnitPrice (the validators enforce it).</summary>
        public static Int128 Compute(EffectCompositionDto composition)
        {
            Int128 goodsIn = 0;
            foreach (var goods in composition.GoodsIn ?? new())
                goodsIn += (Int128)goods.Quantity * goods.UnitPrice!.Value;

            Int128 goodsOut = 0;
            foreach (var goods in composition.GoodsOut ?? new())
                goodsOut += (Int128)goods.Quantity * goods.UnitPrice!.Value;

            return goodsIn - goodsOut;
        }

        /// <summary>
        /// Throws a 400 naming the required direction and minimum amount when a non-zero balance is not
        /// covered. The same two facts are put in the error's Data (<c>requiredDirection</c>,
        /// <c>requiredAmount</c>) so a form can act on them directly.
        /// </summary>
        public static void EnsureSettled(Int128 balance, EffectCompositionDto composition)
        {
            if (balance == 0)
                return;

            var owedByUs = balance > 0;
            var amount = (ulong)(owedByUs ? balance : -balance);
            var money = owedByUs ? composition.MoneyOut : composition.MoneyIn;

            if (money != null && money.Amount >= amount)
                return;

            var direction = owedByUs ? ReturnEffectDirectionEnum.MONEY_OUT : ReturnEffectDirectionEnum.MONEY_IN;
            var message = owedByUs
                ? $"تراز مالی این تصمیم برقرار نیست: ارزش کالای ورودی از کالای خروجی {amount} ریال بیشتر است، پس تصمیم باید یک پرداخت وجه (moneyOut) به مبلغ دست‌کم {amount} ریال داشته باشد."
                : $"تراز مالی این تصمیم برقرار نیست: ارزش کالای خروجی از کالای ورودی {amount} ریال بیشتر است، پس تصمیم باید یک دریافت وجه (moneyIn) به مبلغ دست‌کم {amount} ریال داشته باشد.";

            throw new ValidationCustomException(message, new { RequiredDirection = direction, RequiredAmount = amount });
        }
    }
}
