using System.ComponentModel;

namespace Domain.Enums
{
    /// <summary>
    /// What a party-ledger row records. Persisted and a frontend contract: explicit values, append only, never renumber.
    /// Deliberately neutral about accounting classification (INSTALLMENT_CHARGE says what happened, not which account it
    /// belongs to) - that is a general-ledger decision for later.
    /// </summary>
    public enum PartyLedgerEntryTypeEnum
    {
        /// <summary>A sale invoice was issued: the customer owes its total (DEBIT).</summary>
        [Description("صدور فاکتور فروش")]
        SALE_INVOICE = 1,

        /// <summary>A supplier's invoice was recorded: we owe its total (CREDIT).</summary>
        [Description("ثبت فاکتور خرید")]
        PURCHASE_INVOICE = 2,

        /// <summary>Accepted excess added a supplement line to an issued purchase invoice (CREDIT).</summary>
        [Description("ضمیمه‌ی فاکتور خرید")]
        PURCHASE_SUPPLEMENT = 3,

        /// <summary>The installment charge on top of a sale invoice (DEBIT).</summary>
        [Description("سود اقساط")]
        INSTALLMENT_CHARGE = 4,

        /// <summary>A payment row: money in from the party (CREDIT) or out to the party (DEBIT).</summary>
        [Description("پرداخت")]
        PAYMENT = 5,

        /// <summary>A return money effect settled on account, with no cash moving (see PartyLedger.ReturnSettlementAsync).</summary>
        [Description("تسویه‌ی مرجوعی در حساب")]
        RETURN_SETTLEMENT = 6,

        /// <summary>Takes back an earlier row (ReversalOfEntryId): a voided payment, a cancelled invoice, a changed charge.</summary>
        [Description("برگشت")]
        REVERSAL = 7,

        /// <summary>
        /// A purchase line closed short (ClosePurchaseItem): the undelivered quantity's share of the line total comes off what
        /// we owe (DEBIT) - the credit note an issued invoice gets instead of being edited. ReopenPurchaseItem reverses it.
        /// </summary>
        [Description("بستن قلم خرید (کسری)")]
        PURCHASE_SHORT_CLOSE = 8,
    }
}
