namespace Application.Features.Report.Dtos
{
    public class PurchaseReportPeriodDto
    {
        public DateTime PeriodStart { get; set; }
        public DateTime PeriodEnd { get; set; }
        public int PurchasesCount { get; set; }
        public UInt64 TotalInvoiceAmount { get; set; }

        /// <summary>Value actually received into inventory this period (unit cost net of line
        /// discount), from the inventory cost ledger's PURCHASE_RECEIVED rows.</summary>
        public decimal TotalReceivedValue { get; set; }

        /// <summary>Purchase-return money recorded this period, as purchase spend: a supplier refund
        /// (MONEY_IN) is negative, a payment to the supplier (MONEY_OUT) positive. Kept apart from
        /// TotalReceivedValue, which is inventory value received.</summary>
        public decimal ReturnMoneyAmount { get; set; }
    }
}
