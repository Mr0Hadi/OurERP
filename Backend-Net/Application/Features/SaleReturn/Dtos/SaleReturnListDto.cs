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
        public SaleReturnStatusEnum Status { get; set; }
        public SalesReturnReasonEnum DominantReason { get; set; }
        public int TotalQuantity { get; set; }
        public UInt64 TotalAmount { get; set; }
    }
}
