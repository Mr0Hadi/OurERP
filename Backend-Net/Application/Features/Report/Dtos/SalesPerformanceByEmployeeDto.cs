namespace Application.Features.Report.Dtos
{
    public class SalesPerformanceByEmployeeDto
    {
        public int UserId { get; set; }
        public string FullName { get; set; }
        public int SalesCount { get; set; }
        public UInt64 TotalInvoiceAmount { get; set; }
    }
}
