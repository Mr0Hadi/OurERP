using System.ComponentModel;

namespace Application.Features.Accounting
{
    /// <summary>Which kind of party a row of the accounting pages belongs to. Starts at 1 so an unset value is caught.</summary>
    public enum AccountingPartyTypeEnum
    {
        [Description("مشتری")]
        CUSTOMER = 1,

        [Description("تامین‌کننده")]
        SUPPLIER = 2,
    }

    /// <summary>Filter on a party's ledger balance (positive = the party owes us).</summary>
    public enum PartyBalanceStateEnum
    {
        /// <summary>Balance &gt; 0: the party owes us.</summary>
        [Description("بدهکار")]
        DEBTOR = 1,

        /// <summary>Balance &lt; 0: we owe the party.</summary>
        [Description("بستانکار")]
        CREDITOR = 2,

        [Description("تسویه")]
        SETTLED = 3,
    }

    /// <summary>Filter on what is left to pay on an invoice (Remaining = Payable - Paid).</summary>
    public enum InvoicePaymentStateEnum
    {
        /// <summary>Remaining &gt; 0.</summary>
        [Description("باز")]
        OPEN = 1,

        /// <summary>Remaining &lt;= 0.</summary>
        [Description("تسویه‌شده")]
        SETTLED = 2,

        /// <summary>Remaining &gt; 0 and the due date (PaymentDate, else InvoiceDate) is before today.</summary>
        [Description("سررسید گذشته")]
        OVERDUE = 3,
    }

    /// <summary>Sales or purchases, for the endpoints that serve both.</summary>
    public enum DocumentSideEnum
    {
        [Description("فروش")]
        SALE = 1,

        [Description("خرید")]
        PURCHASE = 2,
    }

    /// <summary>What GetTradeBreakdown groups invoice lines by.</summary>
    public enum TradeBreakdownGroupEnum
    {
        [Description("کالا")]
        PRODUCT = 1,

        [Description("دسته‌بندی کالا")]
        CATEGORY = 2,

        /// <summary>The customer (sales) or supplier (purchases).</summary>
        [Description("طرف حساب")]
        PARTY = 3,

        /// <summary>The sales user (sales) or purchasing user (purchases). Lines of documents with no user are grouped under id 0.</summary>
        [Description("کاربر")]
        USER = 4,
    }
}
