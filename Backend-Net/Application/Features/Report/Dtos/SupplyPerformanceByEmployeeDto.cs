namespace Application.Features.Report.Dtos
{
    public class SupplyPerformanceByEmployeeDto
    {
        public int UserId { get; set; }
        public string FullName { get; set; }
        public int PurchasesCount { get; set; }
        public UInt64 TotalInvoiceAmount { get; set; }
    }
}
