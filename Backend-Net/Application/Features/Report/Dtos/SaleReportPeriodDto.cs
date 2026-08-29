namespace Application.Features.Report.Dtos
{
    public class SaleReportPeriodDto
    {
        public DateTime PeriodStart { get; set; }
        public DateTime PeriodEnd { get; set; }
        public int SalesCount { get; set; }
        public UInt64 TotalInvoiceAmount { get; set; }

        /// <summary>Net revenue recognized at shipment time (unit price net of line discount),
        /// from the inventory cost ledger - not the invoice's TotalAmount, since COGS (and
        /// therefore profit) is only knowable once goods actually leave.</summary>
        public decimal Revenue { get; set; }
        public decimal CostOfGoodsSold { get; set; }
        public decimal NetProfit { get; set; }
    }
}
