using Domain.Enums;

namespace Application.Features.SaleReturn.Dtos
{
    public class SaleReturnListDto
    {
        public int Id { get; set; }
        public string ReturnNumber { get; set; }
        public DateTime RequestDate { get; set; }
        public int SaleId { get; set; }
        public string SaleInvoiceNumber { get; set; }
        public int CustomerId { get; set; }
        public string CustomerName { get; set; }
        public DateTime CreatedAt { get; set; }
        public ReturnStatusEnum Status { get; set; }
        public ReturnProblemEnum DominantProblem { get; set; }
        public int TotalQuantity { get; set; }
        public UInt64 TotalAmount { get; set; }
    }
}
