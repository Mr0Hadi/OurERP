using Domain.Enums;

namespace Application.Features.WarehouseReceiving.Dtos
{
    public class ReceiveSaleReturnListDto
    {
        public int Id { get; set; }
        public string InvoiceNumber { get; set; }
        public DateTime InvoiceDate { get; set; }
        public int CustomerId { get; set; }
        public string CustomerName { get; set; }
        public UInt64 TotalAmount { get; set; }
        public int ItemCount { get; set; }
    }
}
