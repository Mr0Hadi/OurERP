namespace Application.Features.Report.Dtos
{
    public class CustomerPurchaseStatisticsDto
    {
        public int CustomerId { get; set; }
        public string FullName { get; set; }
        public int SalesCount { get; set; }
        public UInt64 TotalInvoiceAmount { get; set; }
        public UInt64 TotalPaidAmount { get; set; }
    }
}
