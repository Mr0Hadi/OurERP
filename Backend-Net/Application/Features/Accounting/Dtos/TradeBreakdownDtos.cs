namespace Application.Features.Accounting.Dtos
{
    /// <summary>One group of issued invoice lines (a product, category, party or user).</summary>
    public class TradeBreakdownRowDto
    {
        /// <summary>The product, category, customer/supplier or user id. 0 = lines of documents with no user (USER grouping).</summary>
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;

        /// <summary>Product code, PRODUCT grouping only.</summary>
        public string? Code { get; set; }

        /// <summary>Distinct invoices with at least one line in the group.</summary>
        public int InvoiceCount { get; set; }
        public int Quantity { get; set; }
        public decimal GrossAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal NetAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal TotalAmount { get; set; }

        /// <summary>NetAmount as a percent of the period's net (the summary's NetAmount), two decimals.</summary>
        public decimal NetSharePercent { get; set; }
    }

    /// <summary>The whole period (every line matching the date/party/product filters, ignoring the title search).</summary>
    public class TradeBreakdownSummaryDto
    {
        /// <summary>Groups matching the filter, title search included.</summary>
        public int GroupCount { get; set; }
        public int InvoiceCount { get; set; }
        public int Quantity { get; set; }
        public decimal GrossAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal NetAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal TotalAmount { get; set; }
    }
}
