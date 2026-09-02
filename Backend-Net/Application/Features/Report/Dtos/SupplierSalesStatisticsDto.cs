namespace Application.Features.Report.Dtos
{
    public class SupplierSalesStatisticsDto
    {
        public int SupplierId { get; set; }
        public string CompanyName { get; set; }
        public int PurchasesCount { get; set; }
        public UInt64 TotalInvoiceAmount { get; set; }
        public UInt64 TotalPaidAmount { get; set; }
    }
}
