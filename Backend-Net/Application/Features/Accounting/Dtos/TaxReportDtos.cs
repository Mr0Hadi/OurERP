namespace Application.Features.Accounting.Dtos
{
    /// <summary>
    /// Value added tax over one period (or the whole range, for Totals), from the tax stored on each issued invoice line.
    /// Output tax = on sales, input tax = on purchases; NetTaxPayable = Output - Input (negative = a credit).
    /// Returns do not adjust it: a return settles in goods and money, never by editing an issued invoice's tax.
    /// </summary>
    public class TaxReportPeriodDto
    {
        public DateTime PeriodStart { get; set; }

        /// <summary>Start of the next period (exclusive).</summary>
        public DateTime PeriodEnd { get; set; }
        public int SaleInvoiceCount { get; set; }

        /// <summary>Net (after discount, before tax) of taxable sale lines.</summary>
        public decimal TaxableSalesNet { get; set; }
        public decimal ExemptSalesNet { get; set; }
        public decimal OutputTax { get; set; }
        public int PurchaseInvoiceCount { get; set; }
        public decimal TaxablePurchasesNet { get; set; }
        public decimal ExemptPurchasesNet { get; set; }
        public decimal InputTax { get; set; }
        public decimal NetTaxPayable { get; set; }
    }
}
